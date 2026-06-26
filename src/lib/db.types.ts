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
}

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
