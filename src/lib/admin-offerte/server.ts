import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { laadTarieven } from "@/lib/tarieven";
import { valideerTelling, type KeukenTelling, type Tarieven } from "@/lib/rekenen";
import { parsePlannerLink } from "@/lib/ikea-planner/link";
import { leesOntwerp, type GelezenOntwerp } from "@/lib/ikea-planner/lees";
import { PLANNER_FOUT_UITLEG, PlannerFout, naarPlannerFout, type PlannerFoutCategorie } from "@/lib/ikea-planner/fouten";
import type { Artikel } from "@/lib/ikea-planner/bom";
import type { WerkbladSoort } from "@/lib/ikea-planner/telling";
import { leesTekening } from "@/lib/tekening-lezer";
import { BUCKET } from "@/lib/aanvraag-intake";
import { huidigMerk } from "@/lib/merk";
import { maakDraft, zoekLaatsteThread } from "@/lib/gmail/client";
import type { AanvraagInsert, LeadBron, LeadStatus, OfferteDraftInsert, PlannerSnapshotInsert } from "@/lib/db.types";
import { mailNaarHtml, onderwerpNieuw, onderwerpReply, type MailVariant } from "./mail";

/**
 * Server-kant van /admin/offerte. Schakel 1 is exact de website-keten
 * (leesOntwerp: csrf → legal-entity-token (gecachet) → metadata → producten),
 * met dezelfde snapshot als /api/ontwerp-lezen: zonder aanvraag, met lees_token,
 * gekoppeld bij "Opslaan als aanvraag". Schakel 2 rekent in de browser op de
 * tarievenrij die hier wordt meegegeven, zodat toggles direct doorwerken.
 */

export interface Analyse {
  bron: "link" | "pdf";
  plannerUuid: string | null;
  plannerUrl: string | null;
  leesToken: string | null; // snapshot, koppelen bij opslaan
  tekeningPad: string | null; // PDF-terugval
  projectNaam: string | null;
  datumOpgeslagen: string | null;
  telling: KeukenTelling;
  artikelen: Artikel[];
  werkbladGedetecteerd: WerkbladSoort;
  eilandInhoud: string[];
  verankeringsframe: boolean;
  tarieven: { id: string; waarden: Tarieven };
  duurMs: number;
}

export type AnalyseUitkomst =
  | { ok: true; analyse: Analyse }
  | { ok: false; categorie: PlannerFoutCategorie | "invoer" | "tarieven" | "pdf"; melding: string };

export async function analyseerLink(invoer: string): Promise<AnalyseUitkomst> {
  const plannerUrl = invoer.trim().slice(0, 2000);
  const link = parsePlannerLink(plannerUrl);
  if (!link.ok) {
    return { ok: false, categorie: "ongeldige_link", melding: "Geen herkenbare IKEA planner-link (verwacht /planner/<UUID>/ of /remote/<UUID>/view/)." };
  }

  const t0 = Date.now();
  let gelezen: GelezenOntwerp | null = null;
  let fout: PlannerFout | undefined;
  try {
    gelezen = await leesOntwerp(link.uuid);
    const v = valideerTelling(gelezen.resultaat.telling);
    if (!v.ok) throw new PlannerFout("onverwachte_structuur", `telling onvolledig: ${v.ontbrekend.join(", ")}`);
  } catch (e) {
    fout = naarPlannerFout(e);
    gelezen = null;
    console.warn(`[admin-offerte] ${link.uuid}: ${fout.categorie} — ${fout.message}`);
  }

  let tarieven: { id: string; tarieven: Tarieven } | null = null;
  if (gelezen) {
    try {
      tarieven = await laadTarieven(null);
    } catch (e) {
      console.error("[admin-offerte] tarieven laden mislukt:", e);
    }
  }

  // Snapshot van de ruwe BOM, ook bij een fout (zelfde velden als /api/ontwerp-lezen).
  const leesToken = crypto.randomUUID();
  const o = gelezen?.ontwerp;
  const snapshot: PlannerSnapshotInsert = {
    aanvraag_id: null,
    lees_token: leesToken,
    planner_url: plannerUrl,
    ontwerp_uuid: link.uuid,
    status: fout ? fout.categorie : "ok",
    fout_detail: fout?.message ?? null,
    duur_ms: Date.now() - t0,
    project_naam: o?.projectNaam ?? null,
    datum_aangemaakt: o?.datumAangemaakt ?? null,
    datum_opgeslagen: o?.datumOpgeslagen ?? null,
    versie_tag: o?.versieTag ?? null,
    bom_sha256: o?.bomSha256 ?? null,
    vergrendeld: o?.vergrendeld ?? null,
    bom_ruw: o?.bomRuw ?? null,
    project: o?.project ?? null,
    telling: gelezen?.resultaat.telling ?? null,
    tarieven_id: tarieven?.id ?? null,
  };
  const { error } = await supabaseAdmin().from("planner_snapshots").insert(snapshot);
  if (error) console.error("[admin-offerte] snapshot opslaan mislukt:", error.message);

  if (fout || !gelezen) {
    const categorie = fout?.categorie ?? "onverwachte_structuur";
    return { ok: false, categorie, melding: `${PLANNER_FOUT_UITLEG[categorie]}. Detail: ${fout?.message ?? "onbekend"}` };
  }
  if (!tarieven) return { ok: false, categorie: "tarieven", melding: "Geen actieve tarievenrij gevonden in montagebaas.tarieven." };

  const r = gelezen.resultaat;
  return {
    ok: true,
    analyse: {
      bron: "link",
      plannerUuid: link.uuid,
      plannerUrl: link.url,
      leesToken: error ? null : leesToken,
      tekeningPad: null,
      projectNaam: o?.projectNaam ?? null,
      datumOpgeslagen: o?.datumOpgeslagen ?? null,
      telling: r.telling,
      artikelen: r.artikelen,
      werkbladGedetecteerd: r.werkblad,
      eilandInhoud: r.eilandInhoud,
      verankeringsframe: r.verankeringsframe,
      tarieven: { id: tarieven.id, waarden: tarieven.tarieven },
      duurMs: Date.now() - t0,
    },
  };
}

const PDF_WERKBLAD: Record<string, WerkbladSoort> = { steen: "steen", hout: "hout", geen: "geen" };

/** PDF-terugval: bestaande AI-lezing (tekening-lezer.ts) op een upload in de privé bucket. */
export async function analyseerPdf(bestand: File): Promise<AnalyseUitkomst> {
  if (bestand.type !== "application/pdf") return { ok: false, categorie: "invoer", melding: "Alleen PDF." };
  if (bestand.size > 8 * 1024 * 1024) return { ok: false, categorie: "invoer", melding: "PDF is groter dan 8 MB." };

  const t0 = Date.now();
  const db = supabaseAdmin();
  const pad = `admin-offerte/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.pdf`;
  const { error: upErr } = await db.storage
    .from(BUCKET)
    .upload(pad, Buffer.from(await bestand.arrayBuffer()), { contentType: "application/pdf" });
  if (upErr) return { ok: false, categorie: "pdf", melding: `Upload naar de bucket mislukt: ${upErr.message}` };

  let tarieven: { id: string; tarieven: Tarieven };
  try {
    tarieven = await laadTarieven(null);
  } catch (e) {
    return { ok: false, categorie: "tarieven", melding: (e as Error).message };
  }
  try {
    const { validatie, ruw } = await leesTekening(pad);
    if (!validatie.ok) return { ok: false, categorie: "pdf", melding: `Lezing onvolledig: ${validatie.ontbrekend.join(", ")}` };
    const materiaal = String((ruw as { werkblad_materiaal?: unknown })?.werkblad_materiaal ?? "onbekend");
    const telling = validatie.telling;
    if (!PDF_WERKBLAD[materiaal]) telling.aannames.push(`Werkblad uit de PDF: ${materiaal}. Kies het werkbladtype zelf (override).`);
    return {
      ok: true,
      analyse: {
        bron: "pdf",
        plannerUuid: null,
        plannerUrl: null,
        leesToken: null,
        tekeningPad: pad,
        projectNaam: bestand.name,
        datumOpgeslagen: null,
        telling,
        artikelen: [],
        werkbladGedetecteerd: PDF_WERKBLAD[materiaal] ?? "overig",
        eilandInhoud: [],
        verankeringsframe: false,
        tarieven: { id: tarieven.id, waarden: tarieven.tarieven },
        duurMs: Date.now() - t0,
      },
    };
  } catch (e) {
    return { ok: false, categorie: "pdf", melding: `PDF-lezing mislukt: ${(e as Error).message}` };
  }
}

/** Woonplaats bij een postcode via de PDOK Locatieserver (open data, geen sleutel). */
export async function plaatsBijPostcode(postcode: string): Promise<string | null> {
  const pc = postcode.replace(/\s+/g, "").toUpperCase();
  if (!/^\d{4}([A-Z]{2})?$/.test(pc)) return null;
  try {
    const res = await fetch(
      `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${pc}&fq=type:${pc.length === 6 ? "postcode" : "woonplaats"}&rows=1&fl=woonplaatsnaam`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { response?: { docs?: { woonplaatsnaam?: string }[] } };
    return json.response?.docs?.[0]?.woonplaatsnaam ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Opslaan als aanvraag
// ---------------------------------------------------------------------------

export interface BestaandeAanvraag {
  id: string;
  created_at: string;
  naam: string;
  email: string;
  lead_status: LeadStatus;
  offerte_bedrag: number | null;
  match: ("e-mail" | "planner")[];
}

export async function zoekBestaande(email: string, plannerUuid: string | null): Promise<BestaandeAanvraag[]> {
  const db = supabaseAdmin();
  const gevonden = new Map<string, BestaandeAanvraag>();
  const velden = "id, created_at, naam, email, lead_status, offerte_bedrag";
  const voeg = (rij: Omit<BestaandeAanvraag, "match">, m: BestaandeAanvraag["match"][number]) => {
    const r = gevonden.get(rij.id) ?? { ...rij, match: [] };
    if (!r.match.includes(m)) r.match.push(m);
    gevonden.set(rij.id, r);
  };

  const e = email.trim().toLowerCase();
  if (e) {
    const { data, error } = await db.from("aanvragen").select(velden).ilike("email", e).order("created_at", { ascending: false }).limit(10);
    if (error) throw new Error(`Zoeken op e-mail mislukt: ${error.message}`);
    for (const r of data ?? []) voeg(r as Omit<BestaandeAanvraag, "match">, "e-mail");
  }
  if (plannerUuid) {
    const { data: snaps, error } = await db
      .from("planner_snapshots")
      .select("aanvraag_id")
      .eq("ontwerp_uuid", plannerUuid)
      .not("aanvraag_id", "is", null)
      .limit(20);
    if (error) throw new Error(`Zoeken op planner-UUID mislukt: ${error.message}`);
    const ids = [...new Set((snaps ?? []).map((s) => s.aanvraag_id as string))];
    if (ids.length) {
      const { data, error: e2 } = await db.from("aanvragen").select(velden).in("id", ids);
      if (e2) throw new Error(`Aanvragen lezen mislukt: ${e2.message}`);
      for (const r of data ?? []) voeg(r as Omit<BestaandeAanvraag, "match">, "planner");
    }
  }
  return [...gevonden.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export interface OpslaanInvoer {
  naam: string;
  email: string;
  telefoon: string;
  postcode: string;
  bron: LeadBron;
  compleet: number;
  montageklaar: number;
  oudeKeuken: boolean;
  tarievenId: string;
  plannerUuid: string | null;
  leesToken: string | null;
  tekeningPad: string | null;
  draftIds: number[];
  koppelAan: string | null;
}

export type OpslaanUitkomst =
  | { ok: true; aanvraagId: string; gekoppeld: boolean; statusGezet: boolean }
  | { ok: false; bestaande: BestaandeAanvraag[] }
  | { ok: false; fout: string };

/** Statussen waarin een gekoppelde lead naar offerte_verstuurd mag; latere statussen blijven staan. */
const VOOR_OFFERTE: LeadStatus[] = ["nieuw", "contact_gelegd", "offerte_verstuurd", "wacht_op_klant"];

export async function slaOp(i: OpslaanInvoer): Promise<OpslaanUitkomst> {
  const db = supabaseAdmin();
  let aanvraagId: string;
  let statusGezet = true;

  if (!i.koppelAan) {
    const bestaande = await zoekBestaande(i.email, i.plannerUuid);
    if (bestaande.length) return { ok: false, bestaande };

    const rij: AanvraagInsert = {
      naam: i.naam.trim(),
      email: i.email.trim(), // contact is not null in de tabel; leeg als Ilja het niet invulde
      telefoon: i.telefoon.trim(),
      postcode: i.postcode.trim() || null,
      invoermethode: "admin_link",
      bron: i.bron,
      lead_status: "offerte_verstuurd",
      offerte_bedrag: i.compleet,
      prijs_indicatie_min: Math.round(i.montageklaar),
      prijs_indicatie_max: Math.round(i.compleet),
      tarieven_id: i.tarievenId,
      planner_status: i.plannerUuid ? "ok" : null,
      demontage_gekozen: i.oudeKeuken,
      tekening_geupload: !!i.tekeningPad,
      tekening_pad: i.tekeningPad,
      merk: huidigMerk().id,
      notitie: `Aangemaakt in /admin/offerte${i.plannerUuid ? ` (planner ${i.plannerUuid})` : " (PDF)"}`,
    };
    const { data, error } = await db.from("aanvragen").insert(rij).select("id").single();
    if (error || !data) return { ok: false, fout: `Opslaan mislukt: ${error?.message ?? "geen id"}` };
    aanvraagId = data.id as string;
  } else {
    const { data: huidig, error: leesFout } = await db.from("aanvragen").select("id, lead_status").eq("id", i.koppelAan).single();
    if (leesFout || !huidig) return { ok: false, fout: `Bestaande aanvraag niet gevonden: ${leesFout?.message ?? i.koppelAan}` };
    statusGezet = VOOR_OFFERTE.includes(huidig.lead_status as LeadStatus);
    const { error } = await db
      .from("aanvragen")
      .update({
        offerte_bedrag: i.compleet,
        tarieven_id: i.tarievenId,
        demontage_gekozen: i.oudeKeuken,
        ...(statusGezet ? { lead_status: "offerte_verstuurd" as LeadStatus } : {}),
      })
      .eq("id", i.koppelAan);
    if (error) return { ok: false, fout: `Koppelen mislukt: ${error.message}` };
    aanvraagId = i.koppelAan;
  }

  // Snapshot en drafts van deze sessie aan de aanvraag hangen (alleen als ze nog los staan).
  if (i.leesToken && i.plannerUuid) {
    const { error } = await db
      .from("planner_snapshots")
      .update({ aanvraag_id: aanvraagId })
      .eq("lees_token", i.leesToken)
      .eq("ontwerp_uuid", i.plannerUuid)
      .is("aanvraag_id", null);
    if (error) console.error("[admin-offerte] snapshot koppelen mislukt:", error.message);
  }
  if (i.draftIds.length) {
    const { error } = await db.from("offerte_drafts").update({ aanvraag_id: aanvraagId }).in("id", i.draftIds).is("aanvraag_id", null);
    if (error) console.error("[admin-offerte] drafts koppelen mislukt:", error.message);
  }
  return { ok: true, aanvraagId, gekoppeld: !!i.koppelAan, statusGezet };
}

// ---------------------------------------------------------------------------
// Gmail-draft
// ---------------------------------------------------------------------------

export interface DraftInvoer {
  variant: MailVariant;
  tekst: string;
  klantEmail: string;
  plaats: string;
  compleet: number;
  montageklaar: number;
  tarievenId: string;
  plannerUuid: string | null;
  aanvraagId: string | null;
}

export interface DraftUitkomst {
  link: string;
  onderwerp: string;
  reply: boolean;
  draftRowId: number | null;
}

export async function maakOfferteDraft(i: DraftInvoer): Promise<DraftUitkomst> {
  const email = i.klantEmail.trim();
  const thread = email ? await zoekLaatsteThread(email) : null;
  const onderwerp = thread ? onderwerpReply(thread.onderwerp || onderwerpNieuw(i.plaats.trim() || null)) : onderwerpNieuw(i.plaats.trim() || null);
  const draft = await maakDraft({ aan: email, onderwerp, tekst: i.tekst, html: mailNaarHtml(i.tekst) }, thread);

  const rij: OfferteDraftInsert = {
    aanvraag_id: i.aanvraagId,
    planner_uuid: i.plannerUuid,
    gmail_draft_id: draft.draftId,
    gmail_thread_id: draft.threadId,
    variant: i.variant,
    compleet_prijs: i.compleet,
    montageklaar_prijs: i.montageklaar,
    tarieven_id: i.tarievenId,
  };
  const { data, error } = await supabaseAdmin().from("offerte_drafts").insert(rij).select("id").single();
  if (error) console.error("[admin-offerte] draft loggen mislukt:", error.message);
  return { link: draft.link, onderwerp, reply: !!thread, draftRowId: (data?.id as number | undefined) ?? null };
}
