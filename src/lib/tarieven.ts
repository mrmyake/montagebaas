import { supabaseAdmin } from "@/lib/supabase";
import type { Tarieven } from "@/lib/rekenen";

/**
 * Laadt de actieve tarievenset voor een regio, met terugval op de landelijke set.
 * Selectie: actief = true AND (regio = <regio> OR regio IS NULL), `geldig_vanaf`
 * aflopend, eerste rij. Fase 1: geen regio → alleen de landelijke set.
 *
 * Server-side only (service-role): tarieven zijn interne prijsbasis, geen
 * publieke data.
 */
export async function laadTarieven(
  regio?: string | null
): Promise<{ id: string; tarieven: Tarieven }> {
  const db = supabaseAdmin();

  let query = db
    .from("tarieven")
    .select("id, waarden")
    .eq("actief", true)
    .order("geldig_vanaf", { ascending: false })
    .limit(1);

  // Met regio: regiospecifiek óf landelijk. Zonder regio: alleen landelijk.
  query = regio ? query.or(`regio.eq.${regio},regio.is.null`) : query.is("regio", null);

  const { data, error } = await query.single();
  if (error || !data) {
    throw new Error(
      `Geen actieve tarieven gevonden${regio ? ` voor regio ${regio}` : ""}: ${error?.message ?? "leeg"}`
    );
  }

  return { id: data.id as string, tarieven: data.waarden as Tarieven };
}
