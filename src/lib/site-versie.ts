import type { SiteVersie } from "@/lib/db.types";

/**
 * Welke site staat op / en /offerte: de redesign (v2) of de oude (v1).
 *
 * SITE_VERSIE=v1|v2 beslist. Zonder waarde: productie v1, previews en lokaal v2,
 * zodat een merge naar main de nieuwe site niet ongemerkt live zet. Terugdraaien
 * = SITE_VERSIE=v1 in Vercel en opnieuw deployen, geen codewijziging.
 */
export function siteVersie(): "v1" | "v2" {
  const v = process.env.SITE_VERSIE?.trim();
  if (v === "v1" || v === "v2") return v;
  return process.env.VERCEL_ENV === "production" ? "v1" : "v2";
}

/** Waarde voor aanvragen.site_versie (0018). */
export const SITE_VERSIE_KOLOM: Record<"v1" | "v2", SiteVersie> = { v1: "v1-oud", v2: "v2-redesign" };
