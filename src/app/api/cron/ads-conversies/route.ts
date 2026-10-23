import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { adsUploadActief, draaiAdsConversiesJob, type JobModus } from "@/lib/ads-conversies-job";

/**
 * Dagelijkse upload van offline conversies naar Google Ads (zie vercel.json).
 * Vercel roept deze route aan met `Authorization: Bearer <CRON_SECRET>`.
 *
 * Handmatig: `?mode=plan` (alleen rapport), `?mode=validate` (validateOnly
 * naar Google, niets wegschrijven), `?mode=verzend` (standaard, echte upload).
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

  const mode = new URL(req.url).searchParams.get("mode") ?? "verzend";
  if (mode !== "plan" && mode !== "validate" && mode !== "verzend") {
    return NextResponse.json({ ok: false, error: "Onbekende mode." }, { status: 400 });
  }

  // Kill switch: de cron blijft dan netjes 200 geven (geen dagelijkse foutmelding in Vercel).
  if (mode === "verzend" && !adsUploadActief()) {
    return NextResponse.json({ ok: true, uitgeschakeld: true, melding: "ADS_UPLOAD_ACTIEF is niet 'true'; niets gedaan." });
  }

  try {
    const rapport = await draaiAdsConversiesJob(mode as JobModus);
    const mislukt = rapport.acties.some((a) => a.fout !== undefined);
    return NextResponse.json({ ok: !mislukt, ...rapport }, { status: mislukt ? 502 : 200 });
  } catch (err) {
    console.error("[ads-conversies] job mislukt:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
