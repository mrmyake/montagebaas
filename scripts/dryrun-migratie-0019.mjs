// Dry-run van 0019 op de echte database: alles in één transactie, daarna ROLLBACK. Niets blijft staan.
// Gebruik: node scripts/dryrun-migratie-0019.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const pg = createRequire(import.meta.url)("pg");
const R = new URL("../", import.meta.url).pathname;
const env = Object.fromEntries(readFileSync(R + ".env.local","utf8").split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")]}));
const sql = readFileSync(R + "supabase/migrations/0019_merk.sql","utf8").replace(/^begin;\s*$/m,"").replace(/^commit;\s*$/m,"");
const c = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const kolommenVoor = (await c.query("select column_name from information_schema.columns where table_schema='montagebaas' and table_name='lead_overzicht' order by ordinal_position")).rows.map(r=>r.column_name);
const telVoor = (await c.query("select count(*)::int n from montagebaas.aanvragen")).rows[0].n;
try {
  await c.query("begin");
  await c.query(sql);
  console.log("✓ 0019 draait foutloos");
  console.log("merk per waarde na backfill:", JSON.stringify((await c.query("select merk, count(*)::int n from montagebaas.aanvragen group by merk")).rows), "van", telVoor);
  const kolommenNa = (await c.query("select column_name from information_schema.columns where table_schema='montagebaas' and table_name='lead_overzicht' order by ordinal_position")).rows.map(r=>r.column_name);
  console.log("lead_overzicht: zelfde kolommen + merk achteraan:", JSON.stringify(kolommenNa) === JSON.stringify([...kolommenVoor, "merk"]));
  await c.query("set local role service_role");
  // Insert zoals de huidige productiecode (main) hem doet: zonder merk.
  const oud = await c.query(`insert into montagebaas.aanvragen (type_klus, aantal_kasten_range, opstelling, extras, prijs_indicatie_min, prijs_indicatie_max, postcode, regio, naam, telefoon, email, gewenste_periode, toelichting, invoermethode, site_versie)
    values ('complete_ikea_keuken','8-15','hoek','[]'::jsonb,2100,2850,'1231 TX','Utrecht','Dryrun test','0600000000','dryrun@example.invalid','flexibel',null,'formulier','v2-redesign') returning merk`);
  console.log("✓ insert met productiecode (service_role) werkt; merk =", oud.rows[0].merk);
  // Insert zoals de nieuwe code: merk expliciet.
  const nieuw = await c.query(`insert into montagebaas.aanvragen (naam, telefoon, email, invoermethode, site_versie, merk)
    values ('Dryrun test','0600000000','dryrun@example.invalid','link','v2-redesign','keukenheld') returning merk`);
  console.log("✓ insert met merk keukenheld werkt; merk =", nieuw.rows[0].merk);
  let geweigerd = false;
  try { await c.query("savepoint s1"); await c.query("insert into montagebaas.aanvragen (naam, telefoon, email, merk) values ('x','0600000000','x@example.invalid','anders')"); } catch { geweigerd = true; await c.query("rollback to savepoint s1"); }
  console.log("✓ onbekend merk geweigerd door check:", geweigerd);
  const lo = await c.query("select merk from montagebaas.lead_overzicht order by created_at desc limit 3");
  console.log("✓ lead_overzicht:", lo.rowCount, "rijen, laatste kolom:", lo.fields.at(-1).name, JSON.stringify(lo.rows));
  const roi = await c.query("select * from montagebaas.roi_per_maand limit 3");
  console.log("✓ roi_per_maand:", roi.rowCount, "rijen");
  const wv = await c.query("select aanvraag_id from montagebaas.ads_conversies_te_versturen limit 1");
  console.log("✓ ads_conversies_te_versturen leesbaar,", wv.rowCount, "rij(en) in steekproef");
  await c.query("reset role");
} catch (e) {
  console.error("✗", e.message);
} finally {
  await c.query("rollback");
  const telNa = (await c.query("select count(*)::int n from montagebaas.aanvragen")).rows[0].n;
  const kolom = (await c.query("select count(*)::int n from information_schema.columns where table_schema='montagebaas' and table_name='aanvragen' and column_name='merk'")).rows[0].n;
  console.log("ROLLBACK: aanvragen", telVoor, "→", telNa, "| merk bestaat nog:", kolom === 1);
  await c.end();
}
