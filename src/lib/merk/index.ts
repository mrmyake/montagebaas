import type { Merk } from "./types";
import { montagebaas } from "./montagebaas";

export type { Merk, ReviewQuote } from "./types";

/** Actieve merken. De eerste is de terugval voor onbekende hosts (previews, localhost). */
export const MERKEN: Merk[] = [montagebaas];

/** Merk bij een Host-header ("www.montagebaas.com:443" mag). */
export function merkVoorHost(host: string | null | undefined): Merk {
  const h = (host ?? "").toLowerCase().split(":")[0];
  return MERKEN.find((m) => m.hosts.includes(h)) ?? MERKEN[0];
}

/**
 * Het merk voor de huidige request. Zolang er één merk is, leest dit geen headers:
 * dat zou elke pagina dynamisch maken (geen statische HTML, trager op mobiel).
 * Komt er een tweede merk, dan hier `merkVoorHost((await headers()).get("host"))`,
 * of beter: proxy.ts herschrijft per host naar een [merk]-segment, zodat pagina's
 * statisch blijven.
 */
export function huidigMerk(): Merk {
  return MERKEN[0];
}

export const whatsappUrl = (m: Merk, bericht = m.whatsapp.standaardBericht) =>
  `https://wa.me/${m.whatsapp.nummer}?text=${encodeURIComponent(bericht)}`;

export const reviewSamenvatting = (m: Merk) =>
  `${m.reviews.totaal.score} uit ${m.reviews.totaal.aantal} reviews op Google en Werkspot`;
