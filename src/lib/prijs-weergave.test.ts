// Prijsadapter: bedragen komen uit prijs-tijdelijk.ts (specwaarden) of Schakel 2. Draaien: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PRIJS_TIJDELIJK } from "./prijs-tijdelijk.ts";
import { euro, linkGetoond, linkPrijzen, naarKolommen, ontwerpBand, toonBedrag, vragenIndicatie } from "./prijs-weergave.ts";
import type { PrijsResultaat } from "./rekenen.ts";

const prijs = (vertrouwen: PrijsResultaat["vertrouwen"]): PrijsResultaat => ({
  totaal_minuten: 0,
  assembly_minuten: 0,
  compleet: { dagen: 4, excl: 2285, btw: 479.85, incl: 2764.85 },
  montageklaar: { dagen: 3, excl: 1725, btw: 362.25, incl: 2087.25 },
  besparing_incl: 677.6,
  vertrouwen,
  aannames: [],
});

test("euro: spatie na het teken, punt als duizendtal", () => {
  assert.equal(euro(2775), "€ 2.775");
  assert.equal(euro(995.4), "€ 995");
});

test("vragenroute: band per grootte plus extra's", () => {
  const { getoond } = vragenIndicatie({ klus: "complete_ikea_keuken", grootte: "8-15", extras: { demontage: true, apparaten: true } });
  const b = PRIJS_TIJDELIJK.banden["8-15"];
  const d = PRIJS_TIJDELIJK.extras.demontage;
  assert.deepEqual(getoond, { soort: "band", laag: b.laag + d, hoog: b.hoog + d });
});

test("vragenroute: afmonteren eigen band, losse klus vanaf-prijs", () => {
  assert.deepEqual(vragenIndicatie({ klus: "alleen_afmonteren", grootte: "15+", extras: {} }).getoond, {
    soort: "band",
    ...PRIJS_TIJDELIJK.afmonteren,
  });
  const los = vragenIndicatie({ klus: "losse_klus", grootte: "<8", extras: {} }).getoond;
  assert.deepEqual(los, { soort: "vanaf", vanaf: PRIJS_TIJDELIJK.losseKlusVanaf });
  assert.equal(toonBedrag(los), `vanaf ${euro(PRIJS_TIJDELIJK.losseKlusVanaf)}`);
  assert.deepEqual(naarKolommen(los), { prijs_getoond_laag: 350, prijs_getoond_hoog: 350 });
});

test("PDF-route: Montageklaar scheelt het vaste bedrag", () => {
  const c = ontwerpBand("<8", "compleet", false);
  const m = ontwerpBand("<8", "montageklaar", false);
  assert.equal(c.soort === "band" && m.soort === "band" && c.laag - m.laag, PRIJS_TIJDELIJK.montageklaarScheeltOngeveer);
});

test("link: alleen een vaste prijs bij vlag aan en vertrouwen hoog", () => {
  assert.equal(linkPrijzen(prijs("hoog"), "maatwerk_laminaat", false), null);
  assert.equal(linkPrijzen(prijs("gemiddeld"), "maatwerk_laminaat", true), null);
  const p = linkPrijzen(prijs("hoog"), "laminaat_op_locatie", true);
  assert.deepEqual(p, { compleet: 2765, montageklaar: 2087, werkbladZagen: PRIJS_TIJDELIJK.extras.werkblad_zagen });
  assert.deepEqual(linkGetoond(p, "compleet", true), {
    soort: "vast",
    bedrag: 2765 + PRIJS_TIJDELIJK.extras.werkblad_zagen + PRIJS_TIJDELIJK.extras.demontage,
  });
  assert.deepEqual(naarKolommen(linkGetoond(null, "compleet", false)), { prijs_getoond_laag: null, prijs_getoond_hoog: null });
});
