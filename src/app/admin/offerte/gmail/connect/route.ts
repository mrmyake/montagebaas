import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifieerAdminSessie } from "@/lib/admin-auth";
import { gmailAccount, oauthClient } from "@/lib/gmail/client";
import { oauthUrl } from "@/lib/gmail/mime";

// Start van de eenmalige Gmail-koppeling: state-cookie zetten en door naar Google.
// De redirect-URI volgt het domein waarop je de tool opent (productie of preview)
// en moet in de OAuth-client in Google Cloud staan.
export async function GET(req: Request) {
  await verifieerAdminSessie();
  const origin = new URL(req.url).origin;
  let clientId: string;
  try {
    clientId = oauthClient().clientId;
  } catch (e) {
    return NextResponse.redirect(`${origin}/admin/offerte?gmail=fout&reden=${encodeURIComponent((e as Error).message)}`);
  }
  const state = crypto.randomUUID();
  (await cookies()).set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/admin/offerte/gmail",
    maxAge: 600,
  });
  return NextResponse.redirect(
    oauthUrl({ clientId, redirectUri: `${origin}/admin/offerte/gmail/callback`, state, account: gmailAccount() })
  );
}
