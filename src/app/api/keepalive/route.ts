import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase";

/**
 * Keepalive voor het eigen Supabase-project.
 *
 * Een gratis Supabase-project pauzeert na zeven dagen zonder activiteit. Omdat er
 * klantaanvragen binnenkomen mag dat nooit gebeuren, dus doet Vercel Cron elke
 * ochtend een lichte read (zie vercel.json). Vercel stuurt bij een cron-aanroep
 * `Authorization: Bearer <CRON_SECRET>` mee zodra de env-var CRON_SECRET bestaat;
 * zonder geldige header wordt de route geweigerd, zodat niemand van buitenaf
 * reads kan triggeren.
 *
 * Env: CRON_SECRET (Vercel, production; een willekeurige lange string).
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, reden: "CRON_SECRET niet geconfigureerd" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Authenticatie vereist.", { status: 401 });
  }

  const { data, error } = await supabasePublic.from("steden").select("slug").limit(1);
  if (error) {
    return NextResponse.json({ ok: false, reden: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, rijen: data?.length ?? 0, tijd: new Date().toISOString() });
}
