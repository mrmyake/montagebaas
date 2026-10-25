// IJkpunt (schema-contract v2, §5). Draaien: `npm test`.
// Bewust een VASTE tarievenset (de fase-1 seed), niet uit de DB — we testen de
// rekenregels, niet de DB-inhoud. Node's ingebouwde testrunner + native TS
// type-stripping (Node 23.6+), geen externe dependency.
import { test } from "node:test";
import assert from "node:assert/strict";
import { berekenPrijsUitTelling, isLegeTelling, offerteDagen, rondPrijsAf, valideerTelling, type Tarieven, type KeukenTelling } from "./rekenen.ts";

const TARIEVEN: Tarieven = {
  basis: { dagtarief_excl: 560, effectieve_uren_dag: 7, voorrij_excl: 45, btw: 0.21 },
  minuten: {
    onderkasten: { tijd: 40, asm: 22 },
    bovenkasten: { tijd: 30, asm: 16 },
    hoge_kasten: { tijd: 50, asm: 28 },
    lade_elementen: { tijd: 15, asm: 12 },
    zijwanden: { tijd: 25, asm: 0 },
    plint_meter: { tijd: 10, asm: 0 },
    lichtlijst_meter: { tijd: 12, asm: 0 },
    werkblad_meter: { tijd: 20, asm: 0 },
    uitsparing_spoelbak: { tijd: 60, asm: 0 },
    uitsparing_kookplaat: { tijd: 60, asm: 0 },
    koppeling: { tijd: 30, asm: 0 },
    spatwand_meter: { tijd: 15, asm: 0 },
    spoelbak_kraan: { tijd: 90, asm: 0 },
    vaatwasser: { tijd: 60, asm: 0 },
    inductie: { tijd: 30, asm: 0 },
    gaskookplaat: { tijd: 50, asm: 0 },
    afzuigkap: { tijd: 60, asm: 0 },
    oven: { tijd: 30, asm: 0 },
    koelkast_vriezer: { tijd: 35, asm: 0 },
    magnetron: { tijd: 25, asm: 0 },
    sloop: { tijd: 120, asm: 0 },
    scheve_muren: { tijd: 45, asm: 0 },
    kraanboring: { tijd: 30, asm: 0 },
    afvoer_leidingwerk: { tijd: 30, asm: 0 },
    onderkast_verlichting: { tijd: 25, asm: 0 },
  },
};

const TELLING: KeukenTelling = {
  onderkasten: 12, bovenkasten: 0, hoge_kasten: 3, lade_elementen: 6, zijwanden: 6,
  plint_meter: 9, lichtlijst_meter: 0, werkblad_meter: 6.4, uitsparing_spoelbak: 1,
  uitsparing_kookplaat: 1, koppeling: 1, spatwand_meter: 0, spoelbak_kraan: 1, vaatwasser: 1,
  inductie: 1, gaskookplaat: 0, afzuigkap: 1, oven: 1, koelkast_vriezer: 2, magnetron: 1,
  sloop: 0, scheve_muren: 0, kraanboring: 0, afvoer_leidingwerk: 2, onderkast_verlichting: 0,
  binneninrichting: 0,
  eiland: 0,
  aannames: ["3 hoge kasten aangenomen; vries mogelijk onderbouw", "plint geschat 9 m"],
  vertrouwen: "gemiddeld",
};

test("ijkpunt: minuten", () => {
  const r = berekenPrijsUitTelling(TELLING, TARIEVEN);
  assert.equal(r.totaal_minuten, 1663);
  assert.equal(r.assembly_minuten, 420);
});

test("ijkpunt: Compleet 4 dagen → €2.764,85 incl", () => {
  const r = berekenPrijsUitTelling(TELLING, TARIEVEN);
  assert.equal(r.compleet.dagen, 4);
  assert.equal(r.compleet.excl, 2285);
  assert.equal(r.compleet.incl, 2764.85);
});

test("ijkpunt: Montageklaar 3 dagen → €2.087,25 incl", () => {
  const r = berekenPrijsUitTelling(TELLING, TARIEVEN);
  assert.equal(r.montageklaar.dagen, 3);
  assert.equal(r.montageklaar.excl, 1725);
  assert.equal(r.montageklaar.incl, 2087.25);
});

test("ijkpunt: besparing €677,60 incl", () => {
  const r = berekenPrijsUitTelling(TELLING, TARIEVEN);
  assert.equal(r.besparing_incl, 677.6);
});

test("ijkpunt: metavelden gaan mee in het resultaat", () => {
  const r = berekenPrijsUitTelling(TELLING, TARIEVEN);
  assert.equal(r.vertrouwen, "gemiddeld");
  assert.deepEqual(r.aannames, TELLING.aannames);
});

test("validatie: een ontbrekend telveld → niet doorrekenen", () => {
  const { ...kapot } = TELLING as Record<string, unknown>;
  delete kapot.spoelbak_kraan;
  const res = valideerTelling(kapot);
  assert.equal(res.ok, false);
  assert.ok(!res.ok && res.ontbrekend.includes("spoelbak_kraan"));
});

test("validatie: volledige telling is geldig", () => {
  const res = valideerTelling(TELLING);
  assert.equal(res.ok, true);
});

test("binneninrichting en eiland hebben nog geen minuten in de tarieven: wegen 0", () => {
  const zonder = berekenPrijsUitTelling(TELLING, TARIEVEN);
  const met = berekenPrijsUitTelling({ ...TELLING, binneninrichting: 4, eiland: 1 }, TARIEVEN);
  assert.equal(met.totaal_minuten, zonder.totaal_minuten);
  assert.equal(met.compleet.incl, zonder.compleet.incl);
});

test("lege telling: alle telvelden 0 → leeg; één veld ≠ 0 → niet leeg", () => {
  const leeg = Object.fromEntries(Object.keys(TELLING).map((k) => [k, 0])) as unknown as KeukenTelling;
  const t = { ...leeg, aannames: [], vertrouwen: "laag" } as KeukenTelling;
  assert.equal(isLegeTelling(t), true);
  assert.equal(isLegeTelling({ ...t, oven: 1 }), false);
  assert.equal(isLegeTelling(TELLING), false);
});

// ---------------------------------------------------------------------------
// Dagenmodel (tarieven met basis.vaste_minuten), zie spikes/dagenmodel
// ---------------------------------------------------------------------------

const DAGENMODEL: Tarieven = {
  basis: {
    dagtarief_excl: 560, effectieve_uren_dag: 7, voorrij_excl: 45, btw: 0.21,
    vaste_minuten: 725, buffer_dagen: 0.5, minimum_dagen: 2.5, montageklaar_min_dagen: 1, prijs_eindigt_op: [25, 75, 95],
  },
  minuten: {
    onderkasten: { tijd: 50, asm: 0 },
    bovenkasten: { tijd: 37.5, asm: 0 },
    hoge_kasten: { tijd: 62.5, asm: 0 },
    lade_elementen: { tijd: 15, asm: 0 },
  },
};
const leeg = Object.fromEntries(Object.keys(TELLING).map((k) => [k, 0])) as unknown as KeukenTelling;
const keuken = (velden: Partial<KeukenTelling>): KeukenTelling => ({ ...leeg, aannames: [], vertrouwen: "hoog", ...velden });

test("dagenmodel: prijs naar boven op een bedrag eindigend op 25, 75 of 95", () => {
  assert.equal(rondPrijsAf(1070.85, [25, 75, 95]), 1075); // 1,5 dag
  assert.equal(rondPrijsAf(1748.45, [25, 75, 95]), 1775); // 2,5 dag
  assert.equal(rondPrijsAf(2087.25, [25, 75, 95]), 2095); // 3 dagen
  assert.equal(rondPrijsAf(2426.05, [25, 75, 95]), 2475); // 3,5 dag
  assert.equal(rondPrijsAf(2764.85, [25, 75, 95]), 2775); // 4 dagen
  assert.equal(rondPrijsAf(4120.05, [25, 75, 95]), 4125); // 6 dagen
  assert.equal(rondPrijsAf(2196, [25, 75, 95]), 2225); // over de 95 heen → volgende honderd
  assert.equal(rondPrijsAf(2425, [25, 75, 95]), 2425); // precies raak blijft staan
});

test("dagenmodel: +½ dag buffer, naar boven op een halve dag, nooit voorbij de volgende hele dag", () => {
  const regel = (echt: number) => offerteDagen(echt, 0.5, 2.5);
  assert.equal(regel(3.0), 3.5);
  assert.equal(regel(3.2), 4);
  assert.equal(regel(3.3), 4);
  assert.equal(regel(3.6), 4); // afgetopt op de volgende hele dag
  assert.equal(regel(4.0), 4.5);
  assert.equal(regel(2.2), 3);
  assert.equal(regel(1.4), 2.5); // minimum
});

test("dagenmodel: 6 onder, 3 boven, 2 hoog, 8 lades → 3,3 echte dag → 4 d €2.775 / Montageklaar 3 d €2.095", () => {
  const r = berekenPrijsUitTelling(keuken({ onderkasten: 6, bovenkasten: 3, hoge_kasten: 2, lade_elementen: 8 }), DAGENMODEL);
  assert.equal(r.totaal_minuten, 725 + 300 + 112.5 + 125 + 120);
  assert.equal(r.compleet.dagen, 4);
  assert.equal(r.compleet.incl, 2775);
  assert.equal(r.montageklaar.dagen, 3);
  assert.equal(r.montageklaar.incl, 2095);
  assert.equal(r.besparing_incl, 680);
  assert.equal(Math.round((r.compleet.excl + r.compleet.btw) * 100) / 100, r.compleet.incl); // excl + btw = incl
});

test("dagenmodel: velden zonder tarief (apparaten, eiland, binneninrichting) wegen 0; minimum 2,5 / 1,5 dag", () => {
  const klein = berekenPrijsUitTelling(keuken({ onderkasten: 1, vaatwasser: 1, oven: 1, eiland: 1, binneninrichting: 3 }), DAGENMODEL);
  assert.equal(klein.totaal_minuten, 725 + 50);
  assert.equal(klein.compleet.dagen, 2.5);
  assert.equal(klein.compleet.incl, 1775);
  assert.equal(klein.montageklaar.dagen, 1.5);
  assert.equal(klein.montageklaar.incl, 1075);
});

test("zonder vaste_minuten blijft het oude urenmodel ongewijzigd", () => {
  assert.equal(berekenPrijsUitTelling(TELLING, TARIEVEN).compleet.incl, 2764.85);
});

test("dagenmodel: sloop is een losse toeslag uit de tarieven, niet in de pakketprijs", () => {
  const metToeslagen: Tarieven = { ...DAGENMODEL, toeslagen: { sloop_incl: 995, werkblad_zagen_incl: 350 } };
  const zonder = berekenPrijsUitTelling(keuken({ onderkasten: 6 }), metToeslagen);
  const met = berekenPrijsUitTelling(keuken({ onderkasten: 6, sloop: 1 }), metToeslagen);
  assert.deepEqual(zonder.toeslagen, []);
  assert.deepEqual(met.toeslagen, [{ naam: "sloop oude keuken", incl: 995 }]);
  assert.equal(met.compleet.incl, zonder.compleet.incl);
  assert.deepEqual(berekenPrijsUitTelling(keuken({ onderkasten: 6, sloop: 1 }), DAGENMODEL).toeslagen, []); // zonder bedrag in de tarieven
});
