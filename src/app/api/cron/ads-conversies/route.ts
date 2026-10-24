import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { adsUploadActief, adsUploadGeconfigureerd, draaiAdsConversiesJob, type JobModus } from "@/lib/ads-conversies-job";
import { draaiAdsVerwerkingCheck, type VerwerkingJobRapport } from "@/lib/ads-verwerking-job";

/**
 * Dagelijkse upload van offline conversies naar Google Ads (zie vercel.json).
 * Vercel roept deze route aan met `Authorization: Bearer <CRON_SECRET>`.
 *
 * Handmatig: `?mode=plan` (alleen rapport), `?mode=validate` (validateOnly
 * naar Google, niets wegschrijven), `?mode=verzend` (standaard, echte upload).
 *
 * Na de upload (verzend) volgt de verwerkingscheck: per requestId ouder dan
 * 30 minuten zonder eindstatus de status opvragen en in `verwerking` zetten.
 * Los: `?mode=status` (alleen de check), `?mode=status&alles=1` (elk requestId
 * opnieuw, eenmalig).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function geautoriseerd(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const verwacht = `Bearer ${secret}`;
  if (header.length !== verwacht.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(verwacht));
}

export async function GET(req: Request) {
  if (!geautoriseerd(req)) {
    return NextResponse.json({ ok: false, error: "Niet geautoriseerd." }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const mode = params.get("mode") ?? "verzend";
  if (mode !== "plan" && mode !== "validate" && mode !== "verzend" && mode !== "status") {
    return NextResponse.json({ ok: false, error: "Onbekende mode." }, { status: 400 });
  }

  if (mode === "status") {
    if (!adsUploadGeconfigureerd()) {
      return NextResponse.json({ ok: false, error: "Ads-upload niet ingericht; geen status op te vragen." }, { status: 500 });
    }
    try {
      const verwerking = await draaiAdsVerwerkingCheck({ alles: params.get("alles") === "1" });
      return NextResponse.json({ ok: true, verwerking });
    } catch (err) {
      console.error("[ads-verwerking] check mislukt:", err);
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
  }

  // Kill switch: de cron blijft dan netjes 200 geven (geen dagelijkse foutmelding in Vercel).
  if (mode === "verzend" && !adsUploadActief()) {
    return NextResponse.json({ ok: true, uitgeschakeld: true, melding: "ADS_UPLOAD_ACTIEF is niet 'true'; niets gedaan." });
  }

  try {
    const rapport = await draaiAdsConversiesJob(mode as JobModus);
    const mislukt = rapport.acties.some((a) => a.fout !== undefined);

    // Verwerkingscheck van eerdere uploads; een fout hier mag de upload-uitkomst niet verhullen.
    let verwerking: VerwerkingJobRapport | { fout: string } | undefined;
    if (mode === "verzend") {
      try {
        verwerking = await draaiAdsVerwerkingCheck();
      } catch (err) {
        console.error("[ads-verwerking] check mislukt:", err);
        verwerking = { fout: String(err) };
      }
    }

    return NextResponse.json({ ok: !mislukt, ...rapport, verwerking }, { status: mislukt ? 502 : 200 });
  } catch (err) {
    console.error("[ads-conversies] job mislukt:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
