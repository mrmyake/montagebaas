import "server-only";
import { headers } from "next/headers";
import { controleerBasicAuth } from "@/lib/basic-auth";

/**
 * Herhaalt de Basic-Auth-check uit proxy.ts binnen server actions.
 *
 * proxy.ts dekt /admin/*, maar een matcher-wijziging of een server action die
 * per ongeluk vanaf een andere route wordt aangeroepen zou die dekking stil
 * kunnen verliezen — vandaar deze tweede check vlak bij de mutatie zelf.
 */
export async function verifieerAdminSessie(): Promise<void> {
  const gebruiker = process.env.ADMIN_USER;
  const wachtwoord = process.env.ADMIN_PASSWORD;
  if (!gebruiker || !wachtwoord) {
    throw new Error("Admin-auth is niet geconfigureerd (ADMIN_USER/ADMIN_PASSWORD).");
  }

  const header = (await headers()).get("authorization");
  if (!controleerBasicAuth(header, gebruiker, wachtwoord)) {
    throw new Error("Niet geautoriseerd.");
  }
}
