import { createClient } from "@supabase/supabase-js";

/**
 * Supabase-clients.
 *
 * Montagebaas heeft sinds 2026-09-27 een eigen Supabase-project (organisatie Montagebaas).
 * De data staat in het Postgres-schema `montagebaas` (instelbaar via DB_SCHEMA); dat is zo
 * gebleven bij de verhuizing uit het vroegere gedeelde project, zodat de code en de
 * migraties ongewijzigd konden blijven.
 *
 * ⚠️ EIGENAAR: het schema moet in Supabase onder Settings → API → "Exposed schemas"
 * staan, anders weigert PostgREST de queries met "Invalid schema".
 *
 * - `supabasePublic`: anon-key, alleen voor publieke leesdata (steden). RLS staat dit toe.
 * - `supabaseAdmin()`: service-role key, ALLEEN server-side voor het wegschrijven van leads.
 *   NOOIT importeren in client components.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const schema = process.env.DB_SCHEMA ?? "montagebaas";

export const supabasePublic = createClient(url ?? "", anonKey ?? "", {
  db: { schema },
  auth: { persistSession: false },
});

export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase server-config ontbreekt: zet NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, serviceKey, {
    db: { schema },
    auth: { persistSession: false },
  });
}
