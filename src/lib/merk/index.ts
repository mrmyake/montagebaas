import type { Merk, MerkId } from "./types.ts";
import { montagebaas } from "./montagebaas.ts";
import { keukenheld } from "./keukenheld.ts";

export type { Merk, MerkId, ReviewQuote } from "./types.ts";

export const MERKEN: Record<MerkId, Merk> = { montagebaas, keukenheld };

/** Merk bij een waarde van env MERK. Leeg of onbekend: Montagebaas. */
export function merkVoorId(id: string | null | undefined): Merk {
  const schoon = id?.trim().toLowerCase();
  return schoon && Object.hasOwn(MERKEN, schoon) ? MERKEN[schoon as MerkId] : montagebaas;
}

/**
 * Het actieve merk, uit env MERK (montagebaas | keukenheld, standaard montagebaas).
 * Overstappen en terugdraaien = MERK wijzigen en opnieuw deployen. Alleen op de
 * server: in de browser bestaat MERK niet, dus clientcomponenten krijgen het merk
 * (of de velden die ze nodig hebben) als prop.
 */
export function huidigMerk(): Merk {
  if (typeof window !== "undefined") {
    throw new Error("huidigMerk() alleen op de server; geef het merk als prop door.");
  }
  return merkVoorId(process.env.MERK);
}

/** Basis-URL voor canonical, sitemap, robots en links in mails. NEXT_PUBLIC_SITE_URL is alleen een override. */
export function siteUrl(merk: Merk = huidigMerk()): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || merk.url).replace(/\/$/, "");
}

export const whatsappUrl = (m: Merk, bericht = m.whatsapp.standaardBericht) =>
  `https://wa.me/${m.whatsapp.nummer}?text=${encodeURIComponent(bericht)}`;

export const reviewSamenvatting = (m: Merk) =>
  `${m.reviews.totaal.score} uit ${m.reviews.totaal.aantal} reviews op Google en Werkspot`;
