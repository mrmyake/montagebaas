// Dry-run van 0018 op de echte database: alles in één transactie, daarna ROLLBACK. Niets blijft staan.
// Gebruik: node scripts/dryrun-migratie-0018.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const pg = createRequire(import.meta.url)("pg");
const R = new URL("../", import.meta.url).pathname;
const env = Object.fromEntries(readFileSync(R + ".env.local","utf8").split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")]}));
const sql = readFileSync(R + "supabase/migrations/0018_redesign_intake.sql","utf8").replace(/^begin;\s*$/m,"").replace(/^commit;\s*$/m,"");
const c = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const kolommenVoor = (await c.query("select column_name from information_schema.columns where table_schema='montagebaas' and table_name='ads_conversies_te_versturen' order by ordinal_position")).rows.map(r=>r.column_name);
const telVoor = (await c.query("select count(*)::int n from montagebaas.aanvragen")).rows[0].n;
try {
  await c.query("begin");
  await c.query(sql);
  console.log("✓ 0018 draait foutloos");
  const nieuw = (await c.query("select column_name from information_schema.columns where table_schema='montagebaas' and table_name='aanvragen' and column_name in ('site_versie','pakket_gekozen','demontage_gekozen','prijs_getoond_laag','prijs_getoond_hoog')")).rows.map(r=>r.column_name);
  console.log("nieuwe kolommen:", nieuw.join(", "));
  console.log("site_versie null na backfill:", (await c.query("select count(*)::int n from montagebaas.aanvragen where site_versie is null")).rows[0].n, "van", telVoor);
  const kolommenNa = (await c.query("select column_name from information_schema.columns where table_schema='montagebaas' and table_name='ads_conversies_te_versturen' order by ordinal_position")).rows.map(r=>r.column_name);
  console.log("werkvoorraad: zelfde kolommen + naam achteraan:", JSON.stringify(kolommenNa) === JSON.stringify([...kolommenVoor, "naam"]));
  // Insert zoals de huidige productiecode (main) hem doet, als service_role: zonder de nieuwe kolommen.
  await c.query("savepoint s1");
  await c.query("set local role service_role");
  const ins = await c.query(`insert into montagebaas.aanvragen (type_klus, aantal_kasten_range, opstelling, extras, prijs_indicatie_min, prijs_indicatie_max, postcode, regio, naam, telefoon, email, gewenste_periode, toelichting, invoermethode)
    values ('complete_ikea_keuken','8-15','hoek','[]'::jsonb,2100,2850,'1231 TX','Utrecht','Dryrun test','0600000000','dryrun@example.invalid','flexibel',null,'formulier') returning id, site_versie`);
  console.log("✓ insert met productiecode (service_role) werkt; site_versie =", ins.rows[0].site_versie);
  // Snapshot zonder aanvraag + koppelen, zoals de nieuwe routes.
  const snap = await c.query(`insert into montagebaas.planner_snapshots (aanvraag_id, lees_token, planner_url, ontwerp_uuid, status) values (null, gen_random_uuid(), 'x', 'X', 'ok') returning id, lees_token`);
  await c.query("update montagebaas.planner_snapshots set aanvraag_id=$1 where lees_token=$2 and aanvraag_id is null", [ins.rows[0].id, snap.rows[0].lees_token]);
  console.log("✓ snapshot zonder aanvraag + koppelen werkt als service_role");
  let geweigerd = false;
  try { await c.query("savepoint s2"); await c.query("update montagebaas.planner_snapshots set telling='{}' where id=$1", [snap.rows[0].id]); } catch (e) { geweigerd = true; await c.query("rollback to savepoint s2"); }
  console.log("✓ andere snapshotkolommen wijzigen geweigerd:", geweigerd);
  await c.query("reset role");
  // Wat /admin/leads en /admin/roi lezen.
  await c.query("set local role service_role");
  const lo = await c.query("select * from montagebaas.lead_overzicht order by created_at desc limit 3");
  console.log("✓ lead_overzicht:", lo.rowCount, "rijen, kolommen:", lo.fields.length, "laatste vijf:", lo.fields.slice(-5).map(f=>f.name).join(","));
  const roi = await c.query("select * from montagebaas.roi_per_maand limit 3");
  console.log("✓ roi_per_maand:", roi.rowCount, "rijen");
  const wv = await c.query("select aanvraag_id, naam from montagebaas.ads_conversies_te_versturen limit 1");
  console.log("✓ ads_conversies_te_versturen leesbaar,", wv.rowCount, "rij(en) in steekproef");
  await c.query("reset role");
} catch (e) {
  console.error("✗", e.message);
} finally {
  await c.query("rollback");
  const telNa = (await c.query("select count(*)::int n from montagebaas.aanvragen")).rows[0].n;
  const kolom = (await c.query("select count(*)::int n from information_schema.columns where table_schema='montagebaas' and table_name='aanvragen' and column_name='site_versie'")).rows[0].n;
  console.log("ROLLBACK: aanvragen", telVoor, "→", telNa, "| site_versie bestaat nog:", kolom === 1);
  await c.end();
}
