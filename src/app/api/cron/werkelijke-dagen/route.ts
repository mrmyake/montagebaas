import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { stuurWerkelijkeDagenHerinnering } from "@/lib/notify";
import type { KlusZonderDagen } from "@/lib/werkelijke-dagen";

/**
 * Wekelijkse herinnering (zie vercel.json, maandagochtend): mailt de eigenaar
 * welke uitgevoerde klussen nog geen werkelijk gewerkte dagen hebben (0015).
 * Die dagen zijn de grondwaarheid voor het dagenmodel. Niets te melden → geen mail.
 */
export const dynamic = "force-dynamic";

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

  const { data, error } = await supabaseAdmin()
    .from("lead_overzicht")
    .select("naam, lead_status_gewijzigd_op, offerte_bedrag, gefactureerd_bedrag")
    .eq("lead_status", "uitgevoerd")
    .is("werkelijke_dagen", null)
    .order("lead_status_gewijzigd_op", { ascending: true });
  if (error) {
    console.error("[werkelijke-dagen] lezen mislukt:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const klussen: KlusZonderDagen[] = (data ?? []).map((r) => ({
    naam: r.naam,
    uitgevoerd_sinds: r.lead_status_gewijzigd_op,
    offerte_bedrag: r.offerte_bedrag === null ? null : Number(r.offerte_bedrag),
    gefactureerd_bedrag: r.gefactureerd_bedrag === null ? null : Number(r.gefactureerd_bedrag),
  }));
  if (klussen.length === 0) return NextResponse.json({ ok: true, klussen: 0, mail: false });

  const verstuurd = await stuurWerkelijkeDagenHerinnering(klussen);
  return NextResponse.json({ ok: true, klussen: klussen.length, mail: verstuurd });
}
