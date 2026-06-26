// IJkpunt (schema-contract v2, §5). Draaien: `npm test`.
// Bewust een VASTE tarievenset (de fase-1 seed), niet uit de DB — we testen de
// rekenregels, niet de DB-inhoud. Node's ingebouwde testrunner + native TS
// type-stripping (Node 23.6+), geen externe dependency.
import { test } from "node:test";
import assert from "node:assert/strict";
import { berekenPrijsUitTelling, valideerTelling, type Tarieven, type KeukenTelling } from "./rekenen.ts";

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
