/**
 * Database-types voor Supabase. Spiegelt supabase/migrations/0001_init.sql.
 * Houd in sync met de migratie.
 */

export interface AanvraagRow {
  id: string;
  created_at: string;
  // Keuken-configuratie + prijs: alleen bij het formulier-pad (nullable sinds 0002).
  type_klus: string | null;
  aantal_kasten_range: string | null;
  opstelling: string | null;
  extras: unknown; // jsonb — array van gekozen extra's
  prijs_indicatie_min: number | null;
  prijs_indicatie_max: number | null;
  postcode: string | null;
  regio: string | null;
  // Contact: bij beide paden verplicht.
  naam: string;
  telefoon: string;
  email: string;
  gewenste_periode: string | null;
  toelichting: string | null;
  status: string;
  // Tekening-upload-pad (0002).
  tekening_geupload: boolean;
  tekening_pad: string | null;
  // Tarieven-versie waarmee de prijs is berekend (0003).
  tarieven_id: string | null;
  // Attributie (0004) — uit onze eigen first-party cookie, zie lib/attributie.ts.
  // gclid/gbraid/wbraid zijn alternatieven: er is er altijd hooguit één gevuld.
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_page: string | null;
  referrer: string | null;
  // Alleen gevuld als gtag.js daadwerkelijk draaide (de _ga-cookie bestond).
  // Blijft bewust null bij bezoekers die tracking blokkeren — niets verzinnen.
  ga_client_id: string | null;
  // Sales-pipeline (0005) — LET OP: `status` hierboven is een ander concept
  // (tekening-verwerkingspad, zie tekening-verwerker.ts). Deze twee kolommen
  // bestaan naast elkaar met opzet.
  lead_status: LeadStatus;
  lead_status_gewijzigd_op: string;
  bron: LeadBron;
  offerte_bedrag: number | null;
  gefactureerd_bedrag: number | null; // alleen gevuld bij lead_status 'gewonnen' of 'uitgevoerd' (db check constraint)
  reden_verloren: string | null;
  notitie: string | null;
}

export type LeadStatus =
  | "nieuw"
  | "contact_gelegd"
  | "offerte_verstuurd"
  | "wacht_op_klant"
  | "gewonnen"
  | "uitgevoerd"
  | "verloren"
  | "geen_reactie"
  | "niet_passend";

export const LEAD_STATUSSEN: LeadStatus[] = [
  "nieuw",
  "contact_gelegd",
  "offerte_verstuurd",
  "wacht_op_klant",
  "gewonnen",
  "uitgevoerd",
  "verloren",
  "geen_reactie",
  "niet_passend",
];

// Statussen waarbij een gefactureerd_bedrag is toegestaan (db check constraint).
export const LEAD_STATUSSEN_MET_FACTUUR: LeadStatus[] = ["gewonnen", "uitgevoerd"];

export type LeadBron = "website" | "werkspot" | "doorverwijzing" | "overig";

export const LEAD_BRONNEN: LeadBron[] = ["website", "werkspot", "doorverwijzing", "overig"];

// Spiegelt montagebaas.lead_overzicht (0005_lead_status.sql).
export interface LeadOverzichtRow {
  id: string;
  created_at: string;
  naam: string;
  email: string;
  telefoon: string;
  lead_status: LeadStatus;
  lead_status_gewijzigd_op: string;
  bron: LeadBron;
  offerte_bedrag: number | null;
  gefactureerd_bedrag: number | null;
  reden_verloren: string | null;
  betaalde_klik: boolean;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  landing_page: string | null;
  lead_maand: string;
  stil_sinds: string; // Postgres interval, komt via PostgREST als "HH:MM:SS" of "N days HH:MM:SS"
}

// Spiegelt montagebaas.roi_per_maand (0005_lead_status.sql).
export interface RoiPerMaandRow {
  maand: string;
  kanaal: "werkspot" | "google_ads" | "organisch_of_onbekend";
  aanvragen: number;
  gewonnen: number;
  verloren: number;
  geen_reactie: number;
  conversie_pct: number | null;
  omzet: number;
  kosten: number | null;
  kosten_per_lead: number | null;
  kosten_per_klus: number | null;
  roas: number | null;
}

// Spiegelt montagebaas.advertentiekosten (0005_lead_status.sql).
export interface AdvertentiekostenRow {
  id: number;
  maand: string; // altijd de eerste van de maand
  kanaal: string;
  campagne: string | null;
  kosten: number;
  ingevoerd_op: string;
}

export type AdvertentiekostenInsert = Pick<AdvertentiekostenRow, "maand" | "kanaal" | "kosten"> &
  Partial<Pick<AdvertentiekostenRow, "campagne">>;

// Insert: contact is verplicht; al het overige is optioneel zodat zowel het
// formulier-pad (volledige config) als het upload-pad (alleen bestand + contact) past.
export type AanvraagInsert = Pick<AanvraagRow, "naam" | "telefoon" | "email"> &
  Partial<Omit<AanvraagRow, "id" | "created_at" | "naam" | "telefoon" | "email">>;

export interface StadRow {
  slug: string;
  naam: string;
  provincie: string;
  intro_tekst: string;
  wijken: string[];
  inwoners: number | null;
}
