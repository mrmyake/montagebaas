import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { controleerBasicAuth } from "@/lib/basic-auth";

// Beschermt /admin met HTTP Basic Auth — simpelste variant die past bij een
// eenmanszaak (één gebruiker, geen sessiebeheer nodig). Draait op elke request
// naar /admin/*, óók server-action-POSTs naar diezelfde route.
export function proxy(request: NextRequest) {
  const gebruiker = process.env.ADMIN_USER;
  const wachtwoord = process.env.ADMIN_PASSWORD;

  if (!gebruiker || !wachtwoord) {
    return new NextResponse("Admin-auth is niet geconfigureerd (ADMIN_USER/ADMIN_PASSWORD).", {
      status: 500,
    });
  }

  const header = request.headers.get("authorization");
  if (!controleerBasicAuth(header, gebruiker, wachtwoord)) {
    return new NextResponse("Authenticatie vereist.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Montagebaas admin"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
