// Prijsadapter: alle bedragen uit de tarievenrij (dagenmodel) of Schakel 2. Draaien: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TARIEVEN_DAGENMODEL } from "./__fixtures__/tarieven-dagenmodel.ts";
import {
  extraLabel,
  extraOpties,
  euro,
  linkGetoond,
  linkPrijzen,
  naarKolommen,
  ontwerpBand,
  prijsbronUitTarieven,
  tekstBedragen,
  vragenIndicatie,
} from "./prijs-weergave.ts";
import type { PrijsResultaat } from "./rekenen.ts";

const bron = prijsbronUitTarieven("test-id", TARIEVEN_DAGENMODEL);

const prijs = (vertrouwen: PrijsResultaat["vertrouwen"]): PrijsResultaat => ({
  totaal_minuten: 0,
  assembly_minuten: 0,
  compleet: { dagen: 4, excl: 2285, btw: 479.85, incl: 2775 },
  montageklaar: { dagen: 3, excl: 1725, btw: 362.25, incl: 2095 },
  besparing_incl: 680,
  toeslagen: [],
  vertrouwen,
  aannames: [],
});

test("euro: spatie na het teken, punt als duizendtal", () => {
  assert.equal(euro(2775), "€ 2.775");
});

test("prijsbron: banden, toeslagen en inbegrepen uit de tarievenrij", () => {
  assert.deepEqual(bron.banden["8-14"], { laag: 2095, hoog: 2775, laag_dagen: 3, hoog_dagen: 4 });
  assert.equal(bron.demontage, 995);
  assert.equal(bron.werkbladZagen, 350);
  assert.deepEqual(bron.inbegrepen, { apparaten: true, spoelbak: true });
});

test("prijsbron: Montageklaar = Compleet min 1 dag, afgerond zoals het dagenmodel", () => {
  // Zelfde bedragen als de dagenmodel-PR noemt: 2095→1425, 2475→1775, 2775→2095, 3475→2775.
  assert.deepEqual(bron.montageklaarBanden["8-14"], { laag: 1425, hoog: 2095 });
  assert.deepEqual(bron.montageklaarBanden["<8"], { laag: 1075, hoog: 1775 });
  assert.deepEqual(bron.montageklaarBanden["15+"], { laag: 2095, hoog: 2775 });
  assert.equal(tekstBedragen(bron).montageklaarScheelt, "€ 700");
  assert.equal(tekstBedragen(bron).dagen, "2,5 tot 5");
});

test("prijsbron: een rij zonder banden of toeslagen geeft een fout, geen verzonnen bedrag", () => {
  assert.throws(() => prijsbronUitTarieven("oud", { ...TARIEVEN_DAGENMODEL, indicatiebanden: undefined }));
  assert.throws(() => prijsbronUitTarieven("oud", { ...TARIEVEN_DAGENMODEL, toeslagen: {} }));
});

test("vragenroute: band per grootte plus extra's", () => {
  const { getoond } = vragenIndicatie(bron, { klus: "complete_ikea_keuken", grootte: "8-14", extras: { demontage: true, apparaten: true } });
  assert.deepEqual(getoond, { soort: "band", laag: 2095 + 995, hoog: 2775 + 995 });
});

test("vragenroute: afmonteren en losse klus zonder bedrag", () => {
  assert.equal(vragenIndicatie(bron, { klus: "alleen_afmonteren", grootte: "15+", extras: {} }).getoond, null);
  assert.equal(vragenIndicatie(bron, { klus: "losse_klus", grootte: "<8", extras: { demontage: true } }).getoond, null);
});

test("leidingaanpassing: geen bedrag, telt niet mee, 'Prijs na opname'", () => {
  const leiding = extraOpties(bron).find((e) => e.key === "leiding")!;
  assert.equal(leiding.bedrag, null);
  assert.equal(extraLabel(leiding.bedrag), "Prijs na opname");
  const met = vragenIndicatie(bron, { klus: "complete_ikea_keuken", grootte: "<8", extras: { leiding: true } });
  const zonder = vragenIndicatie(bron, { klus: "complete_ikea_keuken", grootte: "<8", extras: {} });
  assert.deepEqual(met.getoond, zonder.getoond);
  assert.deepEqual(met.regels, [{ label: "Leidingaanpassing", waarde: "na opname" }]);
});

test("PDF-route: Montageklaar-band uit de tarieven, demontage erbij", () => {
  assert.deepEqual(ontwerpBand(bron, "<8", "montageklaar", true), { soort: "band", laag: 1075 + 995, hoog: 1775 + 995 });
});

test("link: alleen een vaste prijs bij vlag aan en vertrouwen hoog", () => {
  assert.equal(linkPrijzen(bron, prijs("hoog"), "maatwerk_laminaat", false), null);
  assert.equal(linkPrijzen(bron, prijs("gemiddeld"), "maatwerk_laminaat", true), null);
  const p = linkPrijzen(bron, prijs("hoog"), "laminaat_op_locatie", true);
  assert.deepEqual(p, { compleet: 2775, montageklaar: 2095, werkbladZagen: 350, demontage: 995 });
  assert.deepEqual(linkGetoond(p, "compleet", true), { soort: "vast", bedrag: 2775 + 350 + 995 });
  assert.deepEqual(naarKolommen(linkGetoond(null, "compleet", false)), { prijs_getoond_laag: null, prijs_getoond_hoog: null });
});
