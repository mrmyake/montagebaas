/**
 * Database-types voor Supabase. Spiegelt supabase/migrations/0001_init.sql.
 * Houd in sync met de migratie.
 */

export interface AanvraagRow {
  id: string;
  created_at: string;
  type_klus: string;
  aantal_kasten_range: string;
  opstelling: string;
  extras: unknown; // jsonb — array van gekozen extra's
  prijs_indicatie_min: number;
  prijs_indicatie_max: number;
  postcode: string;
  regio: string | null;
  naam: string;
  telefoon: string;
  email: string;
  gewenste_periode: string;
  toelichting: string | null;
  status: string;
}

export type AanvraagInsert = Omit<AanvraagRow, "id" | "created_at" | "status"> & {
  status?: string;
};

export interface StadRow {
  slug: string;
  naam: string;
  provincie: string;
  intro_tekst: string;
  wijken: string[];
  inwoners: number | null;
}
