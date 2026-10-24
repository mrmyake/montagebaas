import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { TELVELDEN, valideerTelling } from "@/lib/rekenen";
import { stuurPlannerMonitorAlarm } from "@/lib/notify";
import { leesOntwerp } from "@/lib/ikea-planner/lees";
import { naarPlannerFout } from "@/lib/ikea-planner/fouten";
import verwacht from "@/lib/ikea-planner/__fixtures__/verwacht.json";

/**
 * Dagelijkse controle van de planner-link-keten (zie vercel.json). Leest een
 * vast eigen testontwerp (env PLANNER_MONITOR_UUID) uit, precies zoals bij een
 * lead, en mailt (PLANNER_MONITOR_TO, standaard ilja@montagebaas.com) als:
 *  - ophalen faalt (token-keten, 404, timeout, …),
 *  - de structuur niet meer klopt of de telling onvolledig is,
 *  - de prijscontrole van de BOM niet sluit, of productgegevens ontbreken,
 *  - bij een ongewijzigd ontwerp (zelfde BOM-hash als de fixture) de telling
 *    afwijkt van __fixtures__/verwacht.json — dan is de mapping stuk.
 * Een gewijzigd ontwerp (andere hash) is geen fout, wel zichtbaar in de respons.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function geautoriseerd(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const verwachtHeader = `Bearer ${secret}`;
  if (header.length !== verwachtHeader.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(verwachtHeader));
}

export async function GET(req: Request) {
  if (!geautoriseerd(req)) {
    return NextResponse.json({ ok: false, error: "Niet geautoriseerd." }, { status: 401 });
  }

  // Alleen lokaal: ?uuid=… om een fout te forceren en het alarm te testen.
  const override =
    process.env.NODE_ENV === "development" ? new URL(req.url).searchParams.get("uuid") : null;
  const uuid = (override ?? process.env.PLANNER_MONITOR_UUID ?? "").trim().toUpperCase();

  const problemen: string[] = [];
  const details: Record<string, unknown> = { uuid };

  if (!uuid) {
    problemen.push("PLANNER_MONITOR_UUID is niet ingesteld");
  } else {
    const t0 = Date.now();
    try {
      const g = await leesOntwerp(uuid);
      const t = g.resultaat.telling;
      details.duur_ms = Date.now() - t0;
      details.project_naam = g.ontwerp.projectNaam;
      details.laatst_opgeslagen = g.ontwerp.datumOpgeslagen;
      details.bom_sha256 = g.ontwerp.bomSha256;
      details.artikelen = g.resultaat.artikelen.length;
      details.prijscontrole = g.resultaat.prijscontrole;

      const v = valideerTelling(t);
      if (!v.ok) problemen.push(`Telling onvolledig: ${v.ontbrekend.join(", ")}`);
      if (g.resultaat.prijscontrole.verschil !== 0) {
        problemen.push(`Prijscontrole BOM sluit niet (verschil ${g.resultaat.prijscontrole.verschil})`);
      }
      if (!(t.onderkasten > 0)) problemen.push("Geen onderkasten geteld");
      if (g.zonderProductgegevens.length) {
        problemen.push(`Geen productgegevens voor: ${g.zonderProductgegevens.join(", ")}`);
      }

      const zelfdeOntwerp = verwacht.uuid === uuid && verwacht.bom_sha256 === g.ontwerp.bomSha256;
      details.ontwerp_ongewijzigd = zelfdeOntwerp;
      if (zelfdeOntwerp) {
        const verwachteTelling = verwacht.telling as unknown as Record<string, number>;
        const afwijkend = TELVELDEN.filter((k) => t[k] !== verwachteTelling[k]).map(
          (k) => `${k}: verwacht ${verwachteTelling[k]}, kreeg ${t[k]}`
        );
        if (afwijkend.length) problemen.push(`Mapping wijkt af van de fixture: ${afwijkend.join("; ")}`);
      }
    } catch (e) {
      const f = naarPlannerFout(e);
      details.duur_ms = Date.now() - t0;
      problemen.push(`Ophalen mislukt: ${f.categorie} — ${f.message}`);
    }
  }

  if (problemen.length) {
    console.error("[planner-monitor] faalt:", problemen, details);
    await stuurPlannerMonitorAlarm({ uuid: uuid || "(geen)", problemen, details });
    return NextResponse.json({ ok: false, problemen, ...details }, { status: 502 });
  }
  return NextResponse.json({ ok: true, ...details });
}
