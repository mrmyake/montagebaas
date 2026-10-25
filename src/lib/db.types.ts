/**
 * Database-types voor Supabase. Spiegelt supabase/migrations/0001_init.sql e.v.
 * Houd in sync met de migratie.
 */

import type { Verwerking } from "@/lib/ads-verwerking";

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
  // Werkelijk gewerkte dagen, in halve dagen (0016). Een meting: blijft staan bij een statuswijziging.
  werkelijke_dagen: number | null;
  // Consent Mode-keuze op het moment van verzenden (0007). null = geen keuze
  // bekend (banner nog open, of aanvraag van vóór de migratie).
  consent_ad_user_data: boolean | null;
  consent_ad_personalization: boolean | null;
  // 'banner' (cookiebalk) of 'formulier' (checkbox bij verzenden), null zonder keuze (0009).
  consent_bron: "banner" | "formulier" | null;
  // Planner-link-ingang (0013). invoermethode is null alleen bij rijen die de
  // backfill niet raakte; planner_status alleen gevuld bij invoermethode 'link'.
  invoermethode: Invoermethode | null;
  planner_status: PlannerStatus | null;
  // Redesign-intake (0018). site_versie: v1-oud voor alles van vóór 0018 en van
  // /offerte-oud. prijs_getoond_*: exact wat de klant zag (incl. btw), beide gelijk
  // bij een vaste prijs, beide null als er geen bedrag getoond is.
  site_versie: SiteVersie; // not null, default v1-oud
  pakket_gekozen: Pakket | null;
  demontage_gekozen: boolean | null;
  prijs_getoond_laag: number | null;
  prijs_getoond_hoog: number | null;
}

export type SiteVersie = "v1-oud" | "v2-redesign";
export type Pakket = "compleet" | "montageklaar";

export type Invoermethode = "formulier" | "link" | "pdf" | "foto";
export type PlannerStatus =
  | "ok"
  | "ongeldige_link"
  | "niet_gevonden"
  | "ikea_fout"
  | "timeout"
  | "onverwachte_structuur";

// Spiegelt montagebaas.planner_snapshots (0013). Onveranderlijk: alleen insert.
// aanvraag_id is null bij een lezing vóór het verzenden (/api/ontwerp-lezen, 0018);
// de link-route koppelt hem dan eenmalig via lees_token.
export interface PlannerSnapshotInsert {
  aanvraag_id: string | null;
  lees_token?: string | null;
  planner_url: string;
  ontwerp_uuid: string;
  status: PlannerStatus;
  fout_detail?: string | null;
  duur_ms?: number | null;
  project_naam?: string | null;
  datum_aangemaakt?: string | null;
  datum_opgeslagen?: string | null;
  versie_tag?: string | null;
  bom_sha256?: string | null;
  vergrendeld?: boolean | null;
  bom_ruw?: string | null;
  project?: unknown;
  telling?: unknown;
  tarieven_id?: string | null;
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

// Statussen die een conversie naar Google Ads opleveren en daarom een bedrag
// vereisen: offerte_verstuurd → offerte_bedrag; gewonnen/uitgevoerd →
// offerte_bedrag of gefactureerd_bedrag (de upload neemt coalesce van beide).
export const LEAD_STATUSSEN_MET_BEDRAG_VERPLICHT: LeadStatus[] = [
  "offerte_verstuurd",
  "gewonnen",
  "uitgevoerd",
];

// Spiegelt montagebaas.ads_conversie_uploads (0007_ads_conversies.sql, derde actie sinds 0008,
// verwerking sinds 0015).
export type AdsUploadStatus = "wachtend" | "verstuurd" | "fout" | "overgeslagen";
export interface AdsConversieUploadRow {
  id: number;
  aanvraag_id: string;
  conversie_actie: "aanvraag_ontvangen" | "offerte_verstuurd" | "opdracht_gewonnen";
  event_tijdstip: string;
  waarde: number;
  status: AdsUploadStatus;
  reden: string | null;
  request_id: string | null;
  response: unknown;
  verzonden_op: string | null;
  verwerking: Verwerking | null;
}

export type LeadBron = "website" | "werkspot" | "doorverwijzing" | "overig";

export const LEAD_BRONNEN: LeadBron[] = ["website", "werkspot", "doorverwijzing", "overig"];

// Spiegelt montagebaas.lead_overzicht (0005_lead_status.sql, notitie sinds 0006).
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
  notitie: string | null; // sinds 0006
  invoermethode: Invoermethode | null; // sinds 0013
  planner_status: PlannerStatus | null; // sinds 0013
  werkelijke_dagen: number | null; // sinds 0016
  site_versie: SiteVersie; // sinds 0018
  pakket_gekozen: Pakket | null; // sinds 0018
  demontage_gekozen: boolean | null; // sinds 0018
  prijs_getoond_laag: number | null; // sinds 0018
  prijs_getoond_hoog: number | null; // sinds 0018
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
