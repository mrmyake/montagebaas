// Verifieert het montagebaas-schema: directe Postgres-insert + supabase-js app-pad.
import { readFileSync } from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const testRow = {
  type_klus: "complete_ikea_keuken",
  aantal_kasten_range: "8-15",
  opstelling: "recht",
  extras: JSON.stringify(["Werkblad monteren"]),
  prijs_indicatie_min: 1400,
  prijs_indicatie_max: 1900,
  postcode: "1011 AB",
  regio: "Noord-Holland / Flevoland",
  naam: "TEST — verify-db",
  telefoon: "0600000000",
  email: "test@example.com",
  gewenste_periode: "binnen_2_weken",
  toelichting: "Automatische test, mag verwijderd worden.",
};

// 1) Directe Postgres-test
const client = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const cols = Object.keys(testRow);
const vals = Object.values(testRow);
const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
const ins = await client.query(
  `insert into montagebaas.aanvragen (${cols.join(", ")}) values (${placeholders}) returning id, created_at, status`,
  vals
);
const id = ins.rows[0].id;
console.log("✓ [pg] insert ok →", id, "| status:", ins.rows[0].status);
const cnt = await client.query("select count(*)::int as n from montagebaas.aanvragen");
console.log("  [pg] rijen in aanvragen:", cnt.rows[0].n);

// 2) supabase-js app-pad (zoals de server action) — vereist exposed schema
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: env.DB_SCHEMA ?? "montagebaas" },
  auth: { persistSession: false },
});
const { data, error } = await supa
  .from("aanvragen")
  .insert({ ...testRow, extras: ["Werkblad monteren"], naam: "TEST — supabase-js" })
  .select("id")
  .single();
if (error) {
  console.log("✗ [supabase-js] insert FAALT:", error.message);
  console.log("  → Voeg 'montagebaas' toe aan Supabase Settings → API → Exposed schemas.");
} else {
  console.log("✓ [supabase-js] insert ok →", data.id);
  await client.query("delete from montagebaas.aanvragen where id = $1", [data.id]);
}

// Opruimen test-rijen
await client.query("delete from montagebaas.aanvragen where naam like 'TEST — %'");
const cnt2 = await client.query("select count(*)::int as n from montagebaas.aanvragen");
console.log("  [pg] rijen na opruimen test-data:", cnt2.rows[0].n);
await client.end();
