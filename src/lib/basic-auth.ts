import { timingSafeEqual, createHash } from "node:crypto";

/**
 * Vergelijkt via een hash van vaste lengte, zodat de lengte van het
 * ingevoerde wachtwoord niet lekt via een timing-verschil.
 */
function veiligGelijk(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function controleerBasicAuth(
  authorizationHeader: string | null,
  verwachteGebruiker: string,
  verwachtWachtwoord: string
): boolean {
  if (!authorizationHeader?.startsWith("Basic ")) return false;

  let decoded: string;
  try {
    decoded = Buffer.from(authorizationHeader.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }

  const scheiding = decoded.indexOf(":");
  if (scheiding === -1) return false;

  const gebruiker = decoded.slice(0, scheiding);
  const wachtwoord = decoded.slice(scheiding + 1);

  return veiligGelijk(gebruiker, verwachteGebruiker) && veiligGelijk(wachtwoord, verwachtWachtwoord);
}
