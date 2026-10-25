import { supabaseAdmin } from "@/lib/supabase";
import { laadTarieven } from "@/lib/tarieven";
import { berekenPrijsUitTelling, TELVELDEN, valideerTelling } from "@/lib/rekenen";
import { stuurNtfy } from "@/lib/ntfy";
import { stuurLinkKlantBevestiging, stuurPlannerNotificatie, type PlannerNotificatie } from "@/lib/notify";
import { euro } from "@/lib/pricing";
import { verstuurAdsConversieDirect } from "@/lib/ads-conversies-job";
import { verwerkTekening } from "@/lib/tekening-verwerker";
import type { PlannerSnapshotInsert, PlannerStatus } from "@/lib/db.types";
import { PLANNER_FOUT_UITLEG, PlannerFout, naarPlannerFout } from "./fouten.ts";
import { leesOntwerp, type GelezenOntwerp } from "./lees.ts";

/**
 * Verwerkt een aanvraag via planner-link NA de lead-capture (zelfde patroon als
 * tekening-verwerker.ts): ophalen → schakel 1 (BOM → telling) → schakel 2
 * (prijs) → snapshot → lead bijwerken → Ads → mails. Draait via `after()`.
 *
 * Nooit een lead kwijt: de aanvraag staat al in de database. Mislukt het
 * ophalen, dan krijgt de lead de foutstatus, de klant de normale bevestiging
 * (met de vraag om de PDF) en Ilja een notificatie met de reden. Zijn er ook
 * bestanden meegestuurd, dan valt de keten terug op de AI-lezing daarvan.
 */

/**
 * Prijs aan de klant tonen bij een link? Uit tot het dagenmodel herzien is
 * (spike-RAPPORT §4b: €320–700 afwijking van verstuurde offertes). Aanzetten
 * vraagt ook een redirect naar /bedankt?a=<id> in TekeningUpload.tsx.
 */
const TOON_PRIJS_BIJ_LINK = false;

// Resend limiteert een mail (incl. bijlagen) op 40 MB; zelfde grens als tekening-verwerker.
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export interface PlannerAanvraag {
  aanvraagId: string;
  plannerUrl: string; // zoals ingevuld door de klant
  genormaliseerdeUrl: string;
  uuid: string;
  klant: { naam: string; email: string; telefoon: string };
  bestanden: { naam: string; buffer: Buffer }[];
  tekeningPad: string | null;
}

export async function verwerkPlannerLink(a: PlannerAanvraag): Promise<void> {
  const db = supabaseAdmin();
  const t0 = Date.now();

  let gelezen: GelezenOntwerp | undefined;
  let fout: PlannerFout | undefined;
  try {
    gelezen = await leesOntwerp(a.uuid);
    const v = valideerTelling(gelezen.resultaat.telling);
    if (!v.ok) throw new PlannerFout("onverwachte_structuur", `telling onvolledig: ${v.ontbrekend.join(", ")}`);
  } catch (e) {
    fout = naarPlannerFout(e);
    gelezen = undefined;
    console.warn(`[planner] ${a.aanvraagId} ${a.uuid}: ${fout.categorie} — ${fout.message}`);
  }
  const duurMs = Date.now() - t0;
  const status: PlannerStatus = fout ? fout.categorie : "ok";
  const notitie = { url: a.genormaliseerdeUrl, status, foutDetail: fout?.message ?? null };

  // Schakel 2 (ongewijzigd). Mislukt het laden van tarieven, dan blijft de lead
  // gewoon staan zonder prijs.
  let prijs: ReturnType<typeof berekenPrijsUitTelling> | undefined;
  let tarievenId: string | null = null;
  let werkbladZagen = 0;
  if (gelezen) {
    try {
      const { id, tarieven } = await laadTarieven(null);
      tarievenId = id;
      prijs = berekenPrijsUitTelling(gelezen.resultaat.telling, tarieven);
      werkbladZagen = tarieven.toeslagen?.werkblad_zagen_incl ?? 0;
    } catch (e) {
      console.error(`[planner] tarieven/prijs mislukt (${a.aanvraagId}):`, e);
    }
  }

  // 1. Snapshot — altijd, ook bij een fout (dan zonder BOM).
  const o = gelezen?.ontwerp;
  const snapshot: PlannerSnapshotInsert = {
    aanvraag_id: a.aanvraagId,
    planner_url: a.plannerUrl,
    ontwerp_uuid: a.uuid,
    status,
    fout_detail: fout?.message ?? null,
    duur_ms: duurMs,
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
  const { error: snapErr } = await db.from("planner_snapshots").insert(snapshot);
  if (snapErr) console.error(`[planner] snapshot opslaan mislukt (${a.aanvraagId}):`, snapErr.message);

  // 2. Lead bijwerken. prijs_indicatie_* = de ongewijzigde schakel 2-uitkomst
  // (zonder toeslag), net als in het tekeningpad.
  const min = prijs ? Math.round(prijs.montageklaar.incl) : null;
  const max = prijs ? Math.round(prijs.compleet.incl) : null;
  const { error: updErr } = await db
    .from("aanvragen")
    .update({
      planner_status: status,
      status: fout ? "controle_link" : "link_verwerkt",
      ...(prijs ? { prijs_indicatie_min: min, prijs_indicatie_max: max, tarieven_id: tarievenId } : {}),
    })
    .eq("id", a.aanvraagId);
  if (updErr) console.error(`[planner] lead bijwerken mislukt (${a.aanvraagId}):`, updErr.message);

  // 3. Onleesbare link maar wél bestanden: terugval op de AI-lezing. Die doet
  // zelf de status, Ads-conversie en beide mails (met de link-fout erin).
  if (fout && a.bestanden.length && a.tekeningPad) {
    await verwerkTekening(a.aanvraagId, a.tekeningPad, null, a.klant, a.bestanden, {
      methode: "link",
      planner: notitie,
    });
    return;
  }

  // 4. Ads-conversie 'aanvraag_ontvangen' pas nu (waarde = prijs_indicatie_max),
  // net als het tekeningpad. Best-effort; de cron vangt de rest.
  await verstuurAdsConversieDirect(a.aanvraagId);

  // 5. Notificaties.
  const r = gelezen?.resultaat;
  const toeslag = r?.werkblad === "laminaat_op_locatie" ? werkbladZagen : 0;
  const telling = r
    ? Object.fromEntries(TELVELDEN.map((k) => [k, r.telling[k] as number]).filter(([, v]) => v))
    : undefined;
  const totaalBytes = a.bestanden.reduce((n, b) => n + b.buffer.byteLength, 0);
  const attachments =
    a.bestanden.length && totaalBytes <= MAX_ATTACHMENT_BYTES
      ? a.bestanden.map((b) => ({ filename: b.naam, content: b.buffer.toString("base64") }))
      : undefined;

  const ownerMail: PlannerNotificatie = {
    aanvraagId: a.aanvraagId,
    ...a.klant,
    planner: notitie,
    bestandsnaam: a.bestanden.length ? a.bestanden.map((b) => b.naam).join(", ") : undefined,
    attachments,
    ontwerp: o
      ? {
          projectNaam: o.projectNaam,
          datumOpgeslagen: o.datumOpgeslagen,
          datumAangemaakt: o.datumAangemaakt,
          vergrendeld: o.vergrendeld,
          bomSha256: o.bomSha256,
        }
      : undefined,
    prijs: prijs
      ? {
          montageklaar: { dagen: prijs.montageklaar.dagen, incl: prijs.montageklaar.incl + toeslag },
          compleet: { dagen: prijs.compleet.dagen, incl: prijs.compleet.incl + toeslag },
          toeslag,
        }
      : undefined,
    telling,
    aannames: r?.telling.aannames,
    artikelen: r?.artikelen,
  };

  await Promise.allSettled([
    stuurNtfy({
      title: fout ? `Planner-link NIET leesbaar (${status}): ${a.klant.naam}` : `Planner-link uitgelezen: ${a.klant.naam}`,
      body: fout
        ? `Lead ${a.aanvraagId}\n${PLANNER_FOUT_UITLEG[fout.categorie]}\n${a.genormaliseerdeUrl}\nKlant is om de PDF gevraagd.`
        : `Lead ${a.aanvraagId}\n${o?.projectNaam ?? ""} (opgeslagen ${o?.datumOpgeslagen?.slice(0, 10) ?? "?"})\n` +
          `${r?.artikelen.length ?? 0} artikelregels\n` +
          (prijs
            ? `Montageklaar ${euro(prijs.montageklaar.incl + toeslag)} / Compleet ${euro(prijs.compleet.incl + toeslag)}` +
              `${toeslag ? ` (incl. €${toeslag} toeslag laminaat zagen)` : ""}\nDagenmodel 2026-10, indicatie. Controleer altijd. Niet aan de klant getoond.`
            : "Geen prijs (tarieven niet geladen)"),
      tags: fout ? "house,warning" : "house,link",
      priority: "high",
    }),
    stuurPlannerNotificatie(ownerMail),
    stuurLinkKlantBevestiging({
      naam: a.klant.naam,
      email: a.klant.email,
      plannerStatus: status,
      prijs: TOON_PRIJS_BIJ_LINK && min && max ? { min, max } : undefined,
    }),
  ]);
}
