import type { ExtraKey, Grootte, Opstelling } from "@/lib/pricing";
import { pricing } from "@/lib/pricing";

export type TypeKlus =
  | "complete_ikea_keuken"
  | "andere_bouwpakketkeuken"
  | "alleen_afmonteren"
  | "losse_klus";

export const typeKlusOpties: { value: TypeKlus; label: string; sub: string }[] = [
  {
    value: "complete_ikea_keuken",
    label: "Complete IKEA-keuken plaatsen",
    sub: "Van bouwpakket tot werkende keuken",
  },
  {
    value: "andere_bouwpakketkeuken",
    label: "Andere bouwpakketkeuken plaatsen",
    sub: "Bv. een keuken van een andere leverancier",
  },
  {
    value: "alleen_afmonteren",
    label: "Alleen afmonteren",
    sub: "Deels al gestart, laatste werk afmaken",
  },
  {
    value: "losse_klus",
    label: "Losse klus",
    sub: "Werkblad, kraan, kookplaat of een ander onderdeel",
  },
];

export const grootteOpties: { value: Grootte; label: string; sub: string }[] = [
  { value: "<8", label: "Kleine keuken", sub: "Minder dan 8 kasten" },
  { value: "8-15", label: "Gemiddelde keuken", sub: "8 tot 15 kasten" },
  { value: "15+", label: "Grote keuken", sub: "15 kasten of meer" },
];

export const opstellingOpties: { value: Opstelling; label: string; sub: string }[] = [
  { value: "recht", label: "Recht", sub: "Eén rechte wand" },
  { value: "hoek", label: "Hoek", sub: "L- of U-vorm" },
  { value: "eiland", label: "Eiland", sub: "Met kookeiland" },
];

export const extraOpties: {
  key: ExtraKey;
  label: string;
  sub: string;
  prijs: number;
  perStuk?: boolean;
}[] = [
  {
    key: "demontage_afvoer",
    label: "Oude keuken demonteren + afvoeren",
    sub: "Inclusief afvoer van het oude materiaal",
    prijs: pricing.extras.demontage_afvoer,
  },
  {
    key: "apparaat_aansluiten",
    label: "Apparaten aansluiten",
    sub: "Oven, kookplaat, vaatwasser, koelkast, etc.",
    prijs: pricing.extras.apparaat_aansluiten,
    perStuk: true,
  },
  {
    key: "werkblad_monteren",
    label: "Werkblad monteren",
    sub: "Standaard werkblad op maat plaatsen",
    prijs: pricing.extras.werkblad_monteren,
  },
  {
    key: "spoelbak_kraan",
    label: "Spoelbak / kraan aansluiten",
    sub: "Inclusief afvoer en watertoevoer",
    prijs: pricing.extras.spoelbak_kraan,
  },
  {
    key: "lichte_leidingaanpassing",
    label: "Lichte leidingaanpassing",
    sub: "Kleine aanpassing aan water of afvoer",
    prijs: pricing.extras.lichte_leidingaanpassing,
  },
];

export const gewensteePeriodeOpties = [
  { value: "zo_snel_mogelijk", label: "Zo snel mogelijk" },
  { value: "binnen_2_weken", label: "Binnen 2 weken" },
  { value: "binnen_een_maand", label: "Binnen een maand" },
  { value: "flexibel", label: "Later / flexibel" },
] as const;

/**
 * Leidt een grove regio af uit de Nederlandse postcode (eerste cijfer).
 * Geen exacte plaatsbepaling — alleen voor interne opvolging/segmentatie.
 */
export function regioUitPostcode(postcode: string): string | null {
  const match = postcode.trim().match(/^(\d)/);
  if (!match) return null;
  const eerste = match[1];
  const map: Record<string, string> = {
    "1": "Noord-Holland / Flevoland",
    "2": "Zuid-Holland",
    "3": "Utrecht / Zuid-Holland-oost",
    "4": "Zeeland / West-Brabant",
    "5": "Noord-Brabant / Limburg-noord",
    "6": "Gelderland-zuid / Limburg",
    "7": "Overijssel / Gelderland-oost",
    "8": "Friesland / Flevoland / Overijssel",
    "9": "Groningen / Drenthe / Friesland",
  };
  return map[eerste] ?? null;
}

/** Valideert een NL-postcode (1234 AB of 1234AB). */
export function isGeldigePostcode(postcode: string): boolean {
  return /^\d{4}\s?[a-zA-Z]{2}$/.test(postcode.trim());
}
