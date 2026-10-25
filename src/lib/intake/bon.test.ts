// Bon en prijsbalk van de intake. Draaien: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bouwBon, type BonInvoer } from "./bon.ts";
import { prijsbronUitTarieven } from "../prijs-weergave.ts";
import { TARIEVEN_DAGENMODEL } from "../__fixtures__/tarieven-dagenmodel.ts";

const basis: BonInvoer = {
  bron: prijsbronUitTarieven("test-id", TARIEVEN_DAGENMODEL),
  route: "link",
  stap: 1,
  link: null,
  aantalBestanden: 0,
  pakket: "compleet",
  demontage: false,
  klus: "complete_ikea_keuken",
  grootte: null,
  opstelling: null,
  extras: {},
  periode: "zo_snel_mogelijk",
};

test("link, stap 1: lege bon, grijze balk", () => {
  const b = bouwBon(basis);
  assert.ok(b.leeg);
  assert.equal(b.gedempt, true);
  assert.equal(b.getoond, null);
});

test("link zonder prijzen (TOON_PRIJS_BIJ_LINK uit): geen bedrag, wel pakket", () => {
  const b = bouwBon({ ...basis, stap: 2, demontage: true, link: { bon: [{ label: "Kasten", waarde: "14" }], prijzen: null } });
  assert.equal(b.getoond, null);
  assert.equal(b.prijsTekst, "Volgt binnen 24 uur");
  assert.ok(!JSON.stringify(b).includes("€"), "geen enkel bedrag op de bon");
});

test("link met prijzen: vaste prijs en het andere pakket als alternatief", () => {
  const b = bouwBon({ ...basis, stap: 2, link: { bon: [], prijzen: { compleet: 2775, montageklaar: 2095, werkbladZagen: 0, demontage: 995 } } });
  assert.equal(b.prijsTekst, "€ 2.775");
  assert.equal(b.altTekst, "Montageklaar: € 2.095");
});

test("vragenroute: pas een bedrag na de keukengrootte, planning vanaf stap 4", () => {
  assert.ok(bouwBon({ ...basis, route: "vragen" }).leeg);
  const b = bouwBon({ ...basis, route: "vragen", stap: 4, grootte: "8-14", opstelling: "hoek" });
  assert.equal(b.leeg, null);
  assert.equal(b.regels[0].label, "Montage IKEA-keuken, gemiddeld, hoek");
  assert.equal(b.regels.at(-1)?.label, "Planning");
});

test("vragenroute, afmonteren: geen bedrag, grijze balk", () => {
  const b = bouwBon({ ...basis, route: "vragen", klus: "alleen_afmonteren", stap: 2, grootte: "<8", opstelling: "recht" });
  assert.equal(b.getoond, null);
  assert.equal(b.gedempt, true);
  assert.equal(b.regels[0].waarde, "prijs volgt");
});
