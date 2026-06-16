// Vult montagebaas.steden in de gedeelde Supabase met de statische stedendata.
// De website zelf draait op src/lib/steden.ts (SSG); dit is voor par/toekomstig gebruik.
// Gebruik: node scripts/seed-steden.mjs
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

// steden.ts heeft alleen een type-only import → veilig te laden met type-stripping.
const { steden } = await import(new URL("../src/lib/steden.ts", import.meta.url).href);

const client = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
let n = 0;
for (const s of steden) {
  await client.query(
    `insert into montagebaas.steden (slug, naam, provincie, intro_tekst, wijken, inwoners)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (slug) do update set
       naam=excluded.naam, provincie=excluded.provincie,
       intro_tekst=excluded.intro_tekst, wijken=excluded.wijken, inwoners=excluded.inwoners`,
    [s.slug, s.naam, s.provincie, s.intro, JSON.stringify(s.wijken), s.inwoners ?? null]
  );
  n++;
}
const cnt = await client.query("select count(*)::int as n from montagebaas.steden");
console.log(`✓ ${n} steden geüpsert. Totaal in tabel: ${cnt.rows[0].n}`);
await client.end();
