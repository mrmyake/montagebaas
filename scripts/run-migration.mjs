// Eenmalige migratie-runner. Leest DATABASE_URL uit .env.local en draait een SQL-bestand.
// Gebruik: node scripts/run-migration.mjs supabase/migrations/0001_init.sql
import { readFileSync } from "node:fs";
import pg from "pg";

const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      const val = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      return [l.slice(0, i).trim(), val];
    })
);

const dbUrl = env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL ontbreekt in .env.local");

const sqlFile = process.argv[2];
if (!sqlFile) throw new Error("Geef een SQL-bestand op");
const sql = readFileSync(new URL(`../${sqlFile}`, import.meta.url), "utf8");

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`Verbonden. Draait ${sqlFile} …`);
  await client.query(sql);
  console.log("✓ Migratie geslaagd.");
} catch (err) {
  console.error("✗ Migratie mislukt:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
