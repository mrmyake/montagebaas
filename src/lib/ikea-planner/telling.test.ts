// BOM → KeukenTelling (schakel 1 voor planner-links). Draaien: `npm test`.
// Gecommitte fixture = alleen een eigen ontwerp van Ilja (zie
// scripts/maak-planner-fixture.ts). De werkblad-/apparaatregels staan niet in dat
// ontwerp en worden getest met kleine synthetische BOM's hieronder (geen klantdata).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { leesBom, type BomNode } from "./bom.ts";
import { bomNaarTelling } from "./telling.ts";
import type { ProductInfo } from "./product.ts";
import { TELVELDEN, valideerTelling } from "../rekenen.ts";

const lees = (naam: string) => JSON.parse(readFileSync(new URL(`./__fixtures__/${naam}`, import.meta.url), "utf8"));
const ontwerp = lees("ontwerp.json");
const producten: Record<string, ProductInfo> = lees("producten.json");
const verwacht = lees("verwacht.json");

// ---------------------------------------------------------------------------
// Fixture (eigen ontwerp)
// ---------------------------------------------------------------------------

test("fixture: hash van bom_ruw klopt met de vastgelegde hash", () => {
  assert.equal(createHash("sha256").update(ontwerp.bom_ruw).digest("hex"), ontwerp.bom_sha256);
  assert.equal(verwacht.bom_sha256, ontwerp.bom_sha256);
});

test("fixture: telling gelijk aan verwacht.json (die gebruikt de monitor)", () => {
  const { bom } = leesBom({ appData: { bom: ontwerp.bom_ruw } });
  const { telling } = bomNaarTelling(bom, producten, {
    projectNaam: ontwerp.project.projectName,
    datumOpgeslagen: ontwerp.project.dateUpdate,
  });
  for (const k of TELVELDEN) assert.equal(telling[k], verwacht.telling[k], k);
  assert.deepEqual(telling.aannames, verwacht.telling.aannames);
  assert.equal(valideerTelling(telling).ok, true);
});

// Verwachting van Ilja zelf (niet uit het script): wat er in "MB monitor" hoort te zitten.
test("fixture MB monitor: telling volgens de checklist van het ontwerp", { skip: ontwerp.uuid !== "103DE682-C854-453C-8B9D-D2C96079BBC8" }, () => {
  const { bom } = leesBom({ appData: { bom: ontwerp.bom_ruw } });
  const r = bomNaarTelling(bom, producten);
  const t = r.telling;
  assert.equal(t.onderkasten, 3); // waarvan 1 spoelkast; vaatwasserpositie telt niet
  assert.equal(t.bovenkasten, 2);
  assert.equal(t.hoge_kasten, 2); // oven + inbouwkoelkast
  assert.equal(r.werkblad, "laminaat_op_locatie"); // EKBACKEN op standaardlengte
  assert.ok(t.aannames.some((a) => /op locatie zagen/.test(a)));
  assert.equal(t.uitsparing_spoelbak, 1);
  assert.equal(t.spoelbak_kraan, 1);
  for (const veld of ["vaatwasser", "inductie", "afzuigkap", "oven", "koelkast_vriezer"] as const) {
    assert.equal(t[veld], 1, veld);
  }
  assert.equal(t.gaskookplaat, 0);
  assert.equal(t.vertrouwen, "hoog");
  assert.equal(r.prijscontrole.verschil, 0);
});

// ---------------------------------------------------------------------------
// Synthetische BOM's
// ---------------------------------------------------------------------------

let volgnr = 10000000;
type Item = {
  omschrijving: string;
  naam?: string;
  maat?: string;
  aantal?: number;
  breedteMm?: number; // computedWidth (meters-velden)
  diepteMm?: number;
  ext?: boolean; // maatwerk: EXT-id dat via referentie naar een ART-id verwijst
  leverbaar?: boolean | null;
  sectie?: "products" | "linears";
};

function maakBom(items: Item[]): { bom: BomNode; producten: Record<string, ProductInfo> } {
  const bom: BomNode = { products: [], linears: [], packs: [], decos: [], totalPrice: { current: 0 } };
  const prod: Record<string, ProductInfo> = {};
  let totaal = 0;
  for (const it of items) {
    const nr = String(volgnr++);
    const art = `ART-${nr}-NL`;
    const id = it.ext ? `EXT-${nr}-NL` : art;
    const info: ProductInfo = {
      dbId: id,
      artikelnummer: it.ext ? null : `${nr.slice(0, 3)}.${nr.slice(3, 6)}.${nr.slice(6)}`,
      referentie: art,
      naam: it.naam ?? "TEST",
      omschrijving: it.omschrijving,
      maat: it.maat ?? null,
      breedte: null,
      diepte: null,
      hoogte: null,
      leverbaar: it.leverbaar ?? true,
      eindDatum: null,
    };
    prod[id] = info;
    if (it.ext) prod[art] = { ...info, dbId: art, naam: "", omschrijving: "" }; // maatwerk-ART bestaat niet als los product
    const node: BomNode = { dbID: id, quantity: it.aantal ?? 1, price: { current: { value: 10 } } };
    if (it.breedteMm) node.computedWidth = it.breedteMm;
    if (it.diepteMm) node.computedDepth = it.diepteMm;
    totaal += 10 * (it.aantal ?? 1);
    bom[it.sectie ?? "products"].push(node);
  }
  bom.totalPrice.current = totaal;
  return { bom, producten: prod };
}

const kasten: Item[] = [
  { omschrijving: "onderkast, wit", maat: "60x60x80 cm", aantal: 3 },
  { omschrijving: "onderkast v inbouwapp/spoelbak, wit", maat: "60x60x80 cm" },
  { omschrijving: "hoekonderkast, wit", maat: "128x68x80 cm" },
  { omschrijving: "bovenkast, wit", maat: "60x37x80 cm", aantal: 2 },
  { omschrijving: "hoge kast voor inbouwapparatuur, wit", maat: "60x60x200 cm" },
  { omschrijving: "lade, laag, wit", aantal: 4 },
  { omschrijving: "ladefront, wit", aantal: 4 }, // fronten tellen niet
  { omschrijving: "deur, wit", aantal: 5 },
  { omschrijving: "front voor vaatwasser, wit" }, // vaatwasserpositie: geen frame
  { omschrijving: "ophangrail, verzinkt", aantal: 6 }, // ook bij onderkasten: geen controle
  { omschrijving: "poot voor kast", aantal: 3 }, // pootjes: geen controle
  { omschrijving: "bedekkingspaneel, wit", aantal: 2 },
  { omschrijving: "plint, wit", breedteMm: 2200, sectie: "linears" },
];
const apparaten: Item[] = [
  { omschrijving: "inbouwspoelbak, 1 bak, roestvrij staal" },
  { omschrijving: "keukenmengkraan, roestvrij staalkleur" },
  { omschrijving: "inductiekookplaat, IKEA 300 zwart" },
  { omschrijving: "inbouw vaatwasser, IKEA 500 roestvrij staalkleur, 60 cm" }, // ook zo gespeld
  { omschrijving: "heteluchtoven, zwart IKEA 300" },
  { omschrijving: "koel- / diepvrieskast, IKEA 500 inbouw" },
  { omschrijving: "afzuigkap wand, IKEA 300 zwart" },
];

test("laminaat op standaardlengte + apparatuur: alles geteld, toeslag als aanname", () => {
  const { bom, producten } = maakBom([
    ...kasten,
    ...apparaten,
    { omschrijving: "werkblad, eikeneffect/laminaat", maat: "246x2.8 cm", breedteMm: 2460, diepteMm: 635, sectie: "linears" },
    { omschrijving: "werkblad, eikeneffect/laminaat", maat: "186x2.8 cm", breedteMm: 1200, diepteMm: 635, sectie: "linears" },
  ]);
  const r = bomNaarTelling(bom, producten);
  const t = r.telling;
  assert.equal(r.werkblad, "laminaat_op_locatie");
  assert.equal(t.onderkasten, 5);
  assert.equal(t.bovenkasten, 2);
  assert.equal(t.hoge_kasten, 1);
  assert.equal(t.lade_elementen, 4);
  assert.equal(t.zijwanden, 2);
  assert.equal(t.plint_meter, 2.2);
  assert.equal(t.werkblad_meter, 3.7);
  assert.equal(t.koppeling, 1);
  assert.equal(t.uitsparing_spoelbak, 1);
  assert.equal(t.uitsparing_kookplaat, 1);
  assert.equal(t.spoelbak_kraan, 1);
  assert.equal(t.vaatwasser, 1);
  assert.equal(t.inductie, 1);
  assert.equal(t.oven, 1);
  assert.equal(t.koelkast_vriezer, 1);
  assert.equal(t.afzuigkap, 1);
  assert.equal(t.vertrouwen, "hoog");
  assert.ok(t.aannames.some((a) => /op locatie zagen/.test(a) && /350/.test(a)));
  assert.ok(!t.aannames.some((a) => /ophangrail|poot/i.test(a)));
  assert.equal(valideerTelling(t).ok, true);
});

test("'bovenkast' telt niet als oven, 'ondergelijmde spoelbak' (dienst) niet als spoelbak", () => {
  const { bom, producten } = maakBom([
    { omschrijving: "bovenkast, wit" },
    { omschrijving: "bovenkast met ventilatie, wit" },
    { omschrijving: "ondergelijmde spoelbak, voor maatwerkblad laminaat" },
    { omschrijving: "console voor oven, verzinkt" },
    { omschrijving: "onderkast, wit" },
  ]);
  const t = bomNaarTelling(bom, producten).telling;
  assert.equal(t.oven, 0);
  assert.equal(t.bovenkasten, 2);
  assert.equal(t.spoelbak_kraan, 0);
  assert.equal(t.uitsparing_spoelbak, 0);
});

test("steen/porselein werkblad (maatwerk): blad, uitsparingen, koppeling en spoelbak buiten scope", () => {
  const { bom, producten } = maakBom([
    { omschrijving: "onderkast, wit" },
    ...apparaten,
    { omschrijving: "maatwerkblad, mat ecru/steenpatroon hogedrukporselein", ext: true, breedteMm: 3000, diepteMm: 635, sectie: "linears" },
    { omschrijving: "maatwerkblad, mat ecru/steenpatroon hogedrukporselein", ext: true, breedteMm: 1000, diepteMm: 635, sectie: "linears" },
  ]);
  const r = bomNaarTelling(bom, producten);
  assert.equal(r.werkblad, "steen");
  assert.equal(r.telling.werkblad_meter, 0);
  assert.equal(r.telling.koppeling, 0);
  assert.equal(r.telling.uitsparing_spoelbak, 0);
  assert.equal(r.telling.uitsparing_kookplaat, 0);
  assert.equal(r.telling.spoelbak_kraan, 0);
  assert.equal(r.telling.vaatwasser, 1); // apparatuur blijft
  assert.ok(r.telling.aannames.some((a) => /buiten scope/.test(a)));
});

test("maatwerkblad laminaat: meters tellen, uitsparingen door IKEA", () => {
  const { bom, producten } = maakBom([
    { omschrijving: "onderkast, wit" },
    { omschrijving: "inbouwspoelbak, 1 bak" },
    { omschrijving: "inductiekookplaat, IKEA 500" },
    { omschrijving: "maatwerkblad, licht eikenpatroon/laminaat", ext: true, breedteMm: 2400, diepteMm: 635, sectie: "linears" },
  ]);
  const r = bomNaarTelling(bom, producten);
  assert.equal(r.werkblad, "maatwerk_laminaat");
  assert.equal(r.telling.werkblad_meter, 2.4);
  assert.equal(r.telling.uitsparing_spoelbak, 0);
  assert.equal(r.telling.uitsparing_kookplaat, 0);
  assert.equal(r.telling.spoelbak_kraan, 1);
});

test("'steenpatroon/laminaat' is laminaat, geen steen", () => {
  const { bom, producten } = maakBom([
    { omschrijving: "onderkast, wit" },
    { omschrijving: "werkblad, donkergrijs steenpatroon/laminaat", breedteMm: 2460, diepteMm: 635, sectie: "linears" },
  ]);
  assert.equal(bomNaarTelling(bom, producten).werkblad, "laminaat_op_locatie");
});

test("houten werkblad: toeslag 400–525 als aanname", () => {
  const { bom, producten } = maakBom([
    { omschrijving: "onderkast, wit" },
    { omschrijving: "werkblad, walnoot/fineer", breedteMm: 2460, diepteMm: 635, sectie: "linears" },
  ]);
  const r = bomNaarTelling(bom, producten);
  assert.equal(r.werkblad, "hout");
  assert.ok(r.telling.aannames.some((a) => /400–525/.test(a)));
});

test("niet-leverbaar artikel komt in aannames", () => {
  const { bom, producten } = maakBom([
    { omschrijving: "onderkast, wit" },
    { omschrijving: "keukenmengkraan, zwart", naam: "ÄLMAREN", leverbaar: false },
  ]);
  const t = bomNaarTelling(bom, producten).telling;
  assert.ok(t.aannames.some((a) => /^Niet meer leverbaar: .*ÄLMAREN/.test(a)));
});

test("kastbreedte 90 cm geeft een signaal, maar vertrouwen blijft hoog", () => {
  const { bom, producten } = maakBom([{ omschrijving: "onderkast, wit", maat: "90x60x80 cm" }]);
  const t = bomNaarTelling(bom, producten).telling;
  assert.ok(t.aannames.some((a) => /90 cm/.test(a)));
  assert.equal(t.vertrouwen, "hoog");
});

test("prijscontrole die niet sluit wordt een aanname, geen fout", () => {
  const { bom, producten } = maakBom([{ omschrijving: "onderkast, wit" }]);
  bom.totalPrice.current = 99;
  const r = bomNaarTelling(bom, producten);
  assert.equal(r.prijscontrole.verschil, -89);
  assert.ok(r.telling.aannames.some((a) => /Prijscontrole/.test(a)));
});

test("bron en versie staan altijd in de aannames", () => {
  const { bom, producten } = maakBom([{ omschrijving: "onderkast, wit" }]);
  const t = bomNaarTelling(bom, producten, { projectNaam: "Test", datumOpgeslagen: "2026-10-22T14:45:20.000Z" }).telling;
  assert.ok(t.aannames.includes('Bron: IKEA planner-link "Test", laatst opgeslagen 2026-10-22'));
});
