import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Status-poll voor de bedankpagina (upload-pad): geeft uitsluitend de verwerk-
 * status + de indicatieve prijsrange terug op basis van het lead-id. Géén
 * persoonsgegevens — het id is een ongeraadbare UUID.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id ontbreekt" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("aanvragen")
    .select("status, prijs_indicatie_min, prijs_indicatie_max")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
  }

  return NextResponse.json(
    {
      status: data.status,
      prijs_min: data.prijs_indicatie_min,
      prijs_max: data.prijs_indicatie_max,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
