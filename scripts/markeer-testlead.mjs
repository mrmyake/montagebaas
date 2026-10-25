// Markeert een testlead zodat hij nooit als conversie naar Google Ads gaat.
// Zet voor elke conversieactie een rij 'overgeslagen' in ads_conversie_uploads
// (bestaat er al een rij, dan blijft die staan: on conflict do nothing). De
// werkvoorraad slaat 'overgeslagen' over, dus ook de cron raakt hem niet meer.
//
// Weigert alles wat geen testlead is: het e-mailadres moet onder dezelfde
// uitsluitregel vallen als de Ads-upload (valtOnderUitsluiting met ADS_UITSLUITEN,
// of de standaardlijst als die niet gezet is). Zo telt me+test@ilja.com ook mee.
//
// Gebruik: node scripts/markeer-testlead.mjs <aanvraag-id> [...]
import { readFileSync } from "node:fs";
import pg from "pg";
import { ADS_UITSLUITEN_STANDAARD, parseUitsluitregels, valtOnderUitsluiting } from "../src/lib/ads-conversies.ts";

const ACTIES = ["aanvraag_ontvangen", "offerte_verstuurd", "opdracht_gewonnen"];

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const uitsluiten = parseUitsluitregels(env.ADS_UITSLUITEN?.trim() || ADS_UITSLUITEN_STANDAARD);

const ids = process.argv.slice(2);
if (!ids.length) throw new Error("Geef één of meer aanvraag-id's op");

const c = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  for (const id of ids) {
    const { rows } = await c.query("select id, naam, email, created_at from montagebaas.aanvragen where id = $1", [id]);
    const a = rows[0];
    if (!a) throw new Error(`Aanvraag ${id} bestaat niet`);
    if (!valtOnderUitsluiting(a.email, uitsluiten)) {
      throw new Error(`Aanvraag ${id} ("${a.naam}", ${a.email}) valt niet onder ADS_UITSLUITEN; geen testlead, niets gedaan`);
    }
    for (const actie of ACTIES) {
      await c.query(
        `insert into montagebaas.ads_conversie_uploads (aanvraag_id, conversie_actie, event_tijdstip, waarde, status, reden)
         values ($1, $2, $3, 0, 'overgeslagen', 'testlead redesign Fase 4, handmatig gemarkeerd')
         on conflict (aanvraag_id, conversie_actie) do nothing`,
        [id, actie, a.created_at]
      );
    }
    const u = await c.query(
      `select conversie_actie, status, reden, request_id, verzonden_op from montagebaas.ads_conversie_uploads
        where aanvraag_id = $1 order by conversie_actie`,
      [id]
    );
    console.log(`${id} "${a.naam}"`);
    console.table(u.rows);
  }
} finally {
  await c.end();
}
