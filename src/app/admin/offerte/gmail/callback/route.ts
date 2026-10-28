import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifieerAdminSessie } from "@/lib/admin-auth";
import { koppelMetCode } from "@/lib/gmail/client";

// Terugkomst van Google: state controleren, code inwisselen, refresh-token
// versleuteld opslaan (koppelMetCode controleert ook account en scopes).
export async function GET(req: Request) {
  await verifieerAdminSessie();
  const url = new URL(req.url);
  const terug = (status: "gekoppeld" | "fout", reden?: string) =>
    NextResponse.redirect(`${url.origin}/admin/offerte?gmail=${status}${reden ? `&reden=${encodeURIComponent(reden)}` : ""}`);

  const jar = await cookies();
  const verwacht = jar.get("gmail_oauth_state")?.value;
  jar.delete({ name: "gmail_oauth_state", path: "/admin/offerte/gmail" });

  if (url.searchParams.get("error")) return terug("fout", `Google: ${url.searchParams.get("error")}`);
  const code = url.searchParams.get("code");
  if (!code || !verwacht || url.searchParams.get("state") !== verwacht) return terug("fout", "Ongeldige of verlopen koppelpoging (state). Probeer opnieuw.");

  try {
    await koppelMetCode(code, `${url.origin}/admin/offerte/gmail/callback`);
    return terug("gekoppeld");
  } catch (e) {
    console.error("[gmail] koppelen mislukt:", e);
    return terug("fout", (e as Error).message);
  }
}
