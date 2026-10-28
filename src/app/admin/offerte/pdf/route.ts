import { NextResponse } from "next/server";
import { verifieerAdminSessie } from "@/lib/admin-auth";
import { analyseerPdf, type AnalyseUitkomst } from "@/lib/admin-offerte/server";

// PDF-terugval van /admin/offerte. Route handler i.p.v. server action: die
// accepteren standaard maar 1 MB. Vercel begrenst de body op 4,5 MB.
export const maxDuration = 120;

export async function POST(req: Request) {
  await verifieerAdminSessie();
  let bestand: File | null = null;
  try {
    const v = (await req.formData()).get("pdf");
    bestand = v instanceof File ? v : null;
  } catch {
    // valt hieronder
  }
  if (!bestand) {
    return NextResponse.json({ ok: false, categorie: "invoer", melding: "Geen PDF ontvangen." } satisfies AnalyseUitkomst, { status: 400 });
  }
  return NextResponse.json(await analyseerPdf(bestand));
}
