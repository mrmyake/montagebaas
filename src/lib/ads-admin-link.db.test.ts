// De view ads_conversies_te_versturen (0020) tegen een echte Postgres: rijen uit
// /admin/offerte (invoermethode admin_link) krijgen geen aanvraag_ontvangen,
// wel opdracht_gewonnen. Alles in één transactie met ROLLBACK: er blijft niets staan.
// Standaard uit; draaien met een database waarop 0020 is toegepast:
//   ADS_VIEW_DB_URL=postgres://… node --test src/lib/ads-admin-link.db.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { beslis, type TeVersturenRij } from "./ads-conversies.ts";

const url = process.env.ADS_VIEW_DB_URL;

test("view: admin_link zonder aanvraag_ontvangen, opdracht_gewonnen wel (na 24 uur)", { skip: !url && "ADS_VIEW_DB_URL niet gezet" }, async () => {
  const pg = createRequire(import.meta.url)("pg");
  const c = new pg.Client({ connectionString: url, ssl: /127\.0\.0\.1|localhost/.test(url!) ? false : { rejectUnauthorized: false } });
  await c.connect();
  try {
    await c.query("begin");
    const nieuw = async (naam: string, invoermethode: string, email: string) =>
      (
        await c.query(
          `insert into montagebaas.aanvragen (naam, telefoon, email, invoermethode, bron, lead_status, offerte_bedrag)
           values ($1, '', $2, $3::montagebaas.invoermethode, 'website', 'nieuw', 2475) returning id`,
          [naam, email, invoermethode]
        )
      ).rows[0].id as string;
    const admin = await nieuw("Viewtest admin", "admin_link", "viewtest-admin@example.invalid");
    const site = await nieuw("Viewtest site", "link", "viewtest-site@example.invalid");

    // Admin-rij gaat naar gewonnen; het logtijdstip 48 uur terug zetten.
    await c.query("update montagebaas.aanvragen set lead_status = 'gewonnen' where id = $1", [admin]);
    await c.query("update montagebaas.lead_status_log set gewijzigd_op = now() - interval '48 hours' where aanvraag_id = $1", [admin]);

    const rijen = (
      await c.query("select * from montagebaas.ads_conversies_te_versturen where aanvraag_id = any($1)", [[admin, site]])
    ).rows as TeVersturenRij[];
    const acties = (id: string) => rijen.filter((r) => r.aanvraag_id === id).map((r) => r.conversie_actie).sort();

    assert.deepEqual(acties(site), ["aanvraag_ontvangen"]);
    assert.deepEqual(acties(admin), ["opdracht_gewonnen"]);
    const gewonnen = rijen.find((r) => r.aanvraag_id === admin)!;
    assert.equal(gewonnen.invoermethode, "admin_link");
    assert.equal(beslis(gewonnen, { consentOnbekend: "unspecified" }).soort, "versturen");
  } finally {
    await c.query("rollback");
    await c.end();
  }
});
