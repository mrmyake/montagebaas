/**
 * Keuzes en validatie van de nieuwe intake (redesign). Client-veilig: geen
 * bedragen (die komen uit prijs-weergave.ts) en geen server-imports.
 */
import type { Grootte, Opstelling, Pakket, TypeKlus } from "../prijs-weergave.ts";

export interface Optie<T extends string> {
  value: T;
  label: string;
  sub: string;
}

export const KLUS_OPTIES: (Optie<TypeKlus> & { kort: string })[] = [
  { value: "complete_ikea_keuken", label: "Complete IKEA-keuken plaatsen", sub: "Van bouwpakket tot werkende keuken", kort: "Montage IKEA-keuken" },
  { value: "andere_bouwpakketkeuken", label: "Andere bouwpakketkeuken plaatsen", sub: "Bijvoorbeeld een keuken van een andere leverancier", kort: "Montage bouwpakketkeuken" },
  { value: "alleen_afmonteren", label: "Alleen afmonteren", sub: "Deels al gestart, laatste werk afmaken", kort: "Afmonteren" },
  { value: "losse_klus", label: "Losse klus", sub: "Werkblad, kraan, kookplaat of een ander onderdeel", kort: "Losse klus" },
];

export const GROOTTE_OPTIES: (Optie<Grootte> & { kort: string })[] = [
  { value: "<8", label: "Kleine keuken", sub: "Minder dan 8 kasten", kort: "klein" },
  { value: "8-14", label: "Gemiddelde keuken", sub: "8 tot 14 kasten", kort: "gemiddeld" },
  { value: "15+", label: "Grote keuken", sub: "15 kasten of meer", kort: "groot" },
];

export const OPSTELLING_OPTIES: Optie<Opstelling>[] = [
  { value: "recht", label: "Recht", sub: "Eén rechte wand" },
  { value: "hoek", label: "Hoek", sub: "L- of U-vorm" },
  { value: "eiland", label: "Eiland", sub: "Met kookeiland" },
];

export type Periode = "zo_snel_mogelijk" | "binnen_een_maand" | "1_tot_3_maanden" | "weet_ik_nog_niet";

export const PERIODE_OPTIES: Optie<Periode>[] = [
  { value: "zo_snel_mogelijk", label: "Zo snel mogelijk", sub: "De keuken is (bijna) geleverd" },
  { value: "binnen_een_maand", label: "Binnen een maand", sub: "Levering is gepland" },
  { value: "1_tot_3_maanden", label: "Over 1 tot 3 maanden", sub: "Nog aan het plannen" },
  { value: "weet_ik_nog_niet", label: "Weet ik nog niet", sub: "Ik oriënteer me" },
];

export const PAKKET_OPTIES: Optie<Pakket>[] = [
  { value: "compleet", label: "Compleet", sub: "Wij doen alles, van bouwpakket tot werkende keuken." },
  { value: "montageklaar", label: "Montageklaar", sub: "Jij zet kasten en lades in elkaar. Wij plaatsen, stellen af en sluiten aan." },
];

/** NL-postcode, 1234 AB of 1234AB. */
export const isGeldigePostcode = (p: string) => /^\d{4}\s?[a-zA-Z]{2}$/.test(p.trim());
export const isGeldigeEmail = (e: string) => /^\S+@\S+\.\S+$/.test(e.trim());
export const isGeldigeNaam = (n: string) => n.trim().length > 1;
export const isGeldigeTelefoon = (t: string) => t.trim().replace(/[^\d+]/g, "").length >= 8;

const kies = <T extends string>(opties: readonly { value: T }[], v: unknown): T | null =>
  opties.find((o) => o.value === v)?.value ?? null;

export const leesKlus = (v: unknown) => kies(KLUS_OPTIES, v);
export const leesGrootte = (v: unknown) => kies(GROOTTE_OPTIES, v);
export const leesOpstelling = (v: unknown) => kies(OPSTELLING_OPTIES, v);
export const leesPeriode = (v: unknown) => kies(PERIODE_OPTIES, v);
export const leesPakket = (v: unknown) => kies(PAKKET_OPTIES, v);

export const periodeLabel = (v: string | null | undefined) =>
  PERIODE_OPTIES.find((o) => o.value === v)?.label ?? v ?? "";
