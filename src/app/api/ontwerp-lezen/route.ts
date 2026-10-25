import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { binnenLimiet, honeypotGevuld } from "@/lib/aanvraag-intake";
import { laadTarieven } from "@/lib/tarieven";
import { berekenPrijsUitTelling, valideerTelling } from "@/lib/rekenen";
import { parsePlannerLink } from "@/lib/ikea-planner/link";
import { leesOntwerp, type GelezenOntwerp } from "@/lib/ikea-planner/lees";
import { PlannerFout, naarPlannerFout, type PlannerFoutCategorie } from "@/lib/ikea-planner/fouten";
import { klantweergave } from "@/lib/ikea-planner/klantweergave";
import { TOON_PRIJS_BIJ_LINK } from "@/lib/ikea-planner/verwerker";
import { linkPrijzen, type LinkPrijzen } from "@/lib/prijs-weergave";
import type { PlannerSnapshotInsert } from "@/lib/db.types";

/**
 * Leest een IKEA Keukenplanner-link VÓÓR het verzenden, zodat de klant chips,
 * pakketkeuze en (als TOON_PRIJS_BIJ_LINK aan staat) een prijs ziet. Maakt geen
 * lead aan en verstuurt dus ook geen Ads-conversie: die gaat pas bij verzenden
 * (/api/offerte-link), precies één keer per lead.
 *
 * De snapshot wordt opgeslagen zonder aanvraag, met een lees_token. Bij
 * verzenden koppelt /api/offerte-link hem aan de lead (0018).
 *
 * Misbruik: deze route raakt de IKEA-API. Daarom dezelfde honeypot en
 * rate limit als de andere ingangen (5/min per IP), plus een uurlimiet per IP
 * en een korte cache per ontwerp, zodat herhaald lezen van hetzelfde ontwerp
 * IKEA niet opnieuw raakt.
 */

export const maxDuration = 30;

const CACHE_MS = 10 * 60_000;
const CACHE_MAX = 200;
const cache = new Map<string, { t: number; gelezen: GelezenOntwerp }>();

function uitCache(uuid: string): GelezenOntwerp | null {
  const hit = cache.get(uuid);
  if (!hit) return null;
  if (Date.now() - hit.t > CACHE_MS) {
    cache.delete(uuid);
    return null;
  }
  return hit.gelezen;
}

function inCache(uuid: string, gelezen: GelezenOntwerp) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(uuid, { t: Date.now(), gelezen });
}

/** Wat de klant ziet als lezen mislukt. Daarna biedt de intake de vragenroute aan. */
const KLANT_MELDING: Record<PlannerFoutCategorie, string> = {
  ongeldige_link: "Dit lijkt geen link naar een IKEA Keukenplanner-ontwerp. Kopieer de deellink opnieuw.",
  niet_gevonden: "We vinden dit ontwerp niet bij IKEA. Is het opgeslagen en gedeeld?",
  ikea_fout: "IKEA geeft je ontwerp nu niet vrij. Probeer het zo nog eens.",
  timeout: "IKEA reageert nu traag. Probeer het zo nog eens.",
  onverwachte_structuur: "We kunnen dit ontwerp niet goed lezen.",
};

export type OntwerpLezenAntwoord =
  | {
      ok: true;
      lees_token: string;
      chips: string[];
      bon: { label: string; waarde: string }[];
      meldingen: string[];
      prijzen: LinkPrijzen | null;
      vertrouwen: "hoog" | "gemiddeld" | "laag";
    }
  | { ok: false; fout: PlannerFoutCategorie | "limiet" | "invoer"; melding: string };

function antwoord(body: OntwerpLezenAntwoord, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  if (!(await binnenLimiet("ontwerp-lezen"))) {
    return antwoord({ ok: false, fout: "limiet", melding: "Even rustig aan. Probeer het over een minuut opnieuw." }, 429);
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "onbekend";
  if (!rateLimit(`ontwerp-lezen-uur:${ip}`, 20, 60 * 60_000).allowed) {
    return antwoord({ ok: false, fout: "limiet", melding: "Je hebt al veel ontwerpen laten lezen. Bel of app ons even." }, 429);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return antwoord({ ok: false, fout: "invoer", melding: KLANT_MELDING.ongeldige_link }, 400);
  }
  if (honeypotGevuld(form)) {
    return antwoord({ ok: false, fout: "invoer", melding: "Er ging iets mis. Probeer het opnieuw." }, 400);
  }

  const plannerUrl = ((form.get("planner_url") as string | null) ?? "").trim().slice(0, 2000);
  const link = parsePlannerLink(plannerUrl);
  if (!link.ok) {
    return antwoord({ ok: false, fout: "ongeldige_link", melding: KLANT_MELDING.ongeldige_link }, 400);
  }

  const t0 = Date.now();
  let gelezen: GelezenOntwerp | null = uitCache(link.uuid);
  let fout: PlannerFout | undefined;
  if (!gelezen) {
    try {
      gelezen = await leesOntwerp(link.uuid);
      const v = valideerTelling(gelezen.resultaat.telling);
      if (!v.ok) throw new PlannerFout("onverwachte_structuur", `telling onvolledig: ${v.ontbrekend.join(", ")}`);
      inCache(link.uuid, gelezen);
    } catch (e) {
      fout = naarPlannerFout(e);
      gelezen = null;
      console.warn(`[ontwerp-lezen] ${link.uuid}: ${fout.categorie} — ${fout.message}`);
    }
  }

  // Schakel 2 alleen als er een bedrag getoond mag worden.
  let prijzen: LinkPrijzen | null = null;
  let tarievenId: string | null = null;
  if (gelezen && TOON_PRIJS_BIJ_LINK) {
    try {
      const { id, tarieven } = await laadTarieven(null);
      tarievenId = id;
      prijzen = linkPrijzen(berekenPrijsUitTelling(gelezen.resultaat.telling, tarieven), gelezen.resultaat.werkblad, true);
    } catch (e) {
      console.error("[ontwerp-lezen] tarieven/prijs mislukt:", e);
    }
  }

  // Snapshot zonder aanvraag, ook bij een fout (zelfde velden als verwerker.ts).
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
    tarieven_id: tarievenId,
  };
  const { error } = await supabaseAdmin().from("planner_snapshots").insert(snapshot);
  if (error) console.error("[ontwerp-lezen] snapshot opslaan mislukt:", error.message);

  if (!gelezen || fout) {
    const categorie = fout?.categorie ?? "onverwachte_structuur";
    return antwoord({ ok: false, fout: categorie, melding: KLANT_MELDING[categorie] });
  }

  const w = klantweergave(gelezen.resultaat);
  return antwoord({
    ok: true,
    // Zonder opgeslagen snapshot valt er niets te koppelen; de lead komt er bij verzenden toch.
    lees_token: error ? "" : leesToken,
    chips: w.chips,
    bon: w.bon,
    meldingen: w.meldingen,
    prijzen,
    vertrouwen: gelezen.resultaat.telling.vertrouwen,
  });
}
