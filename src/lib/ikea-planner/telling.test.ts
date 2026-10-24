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
import { leesOpstelling, type Opstelling } from "./opstelling.ts";
import { existsSync, readdirSync } from "node:fs";

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
    opstelling: ontwerp.opstelling,
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
  positie?: string; // naam van de ASL-positie waarin dit artikel zit
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
    if (it.positie) {
      // Zelfde positienaam = zelfde ASL-node, zoals products[] in een echte BOM.
      let asl = bom.products.find((p: BomNode) => p.dbID.startsWith("ASL-") && prod[p.dbID]?.omschrijving === it.positie);
      if (!asl) {
        asl = { dbID: `ASL-${volgnr++}-NL`, uuid: it.positie, children: [] };
        prod[asl.dbID] = { ...info, dbId: asl.dbID, artikelnummer: null, referentie: null, omschrijving: it.positie };
        bom.products.push(asl);
      }
      asl.children.push(node);
    } else {
      bom[it.sectie ?? "products"].push(node);
    }
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

// ---------------------------------------------------------------------------
// Signalen: kookeiland, binneninrichting, vangnet, eigen apparaten
// ---------------------------------------------------------------------------

const eigen = (apparaat: string) =>
  `Geen ${apparaat} in de lijst: eigen apparaat of nog niet besteld? Merk en type nodig voor nismaten.`;
const tellingVan = (items: Item[]) => {
  const { bom, producten } = maakBom(items);
  return bomNaarTelling(bom, producten).telling;
};

test("verankeringsframe zonder plaatsingsdata: niet geteld, wel de algemene aanname", () => {
  const zonder = tellingVan(kasten);
  const met = tellingVan([...kasten, { omschrijving: "verankeringsframe voor kookeiland", aantal: 2 }]);
  for (const k of TELVELDEN) assert.equal(met[k], zonder[k], k);
  assert.ok(met.aannames.includes("Verankeringsframe voor kookeiland in de lijst: eiland in het ontwerp, of te veel besteld? Controleren."));
  assert.ok(!zonder.aannames.some((a) => /kookeiland/.test(a)));
});

test("binneninrichting: de vijf soorten tellen als aantal, niet in het vangnet", () => {
  const t = tellingVan([
    ...kasten,
    { omschrijving: "uittrekbare kastinrichting, donkergrijs", aantal: 2 },
    { omschrijving: "carrousel onderhoekkast, grijs" },
    { omschrijving: "inrichting onderhoekkast, uittrekb, grijs" },
    { omschrijving: "uittrekbaar frame v afvalsortering, lichtgrijs" },
    { omschrijving: "steunframe voor afvalsorteerbak, wit" },
  ]);
  assert.equal(t.binneninrichting, 6);
  assert.ok(!t.aannames.some((a) => /Niet herkend/.test(a)));
  assert.equal(tellingVan(kasten).binneninrichting, 0);
});

test("vangnet: onbekende soort die op montagewerk lijkt → 'Niet herkend', met artikelnummer", () => {
  const { bom, producten } = maakBom([
    ...kasten,
    ...apparaten,
    { omschrijving: "open opberger, bruin/gebeitst essen" },
    { omschrijving: "wandrek, zwart" },
    { omschrijving: "plank, wit", aantal: 3 }, // bewust genegeerd
    { omschrijving: "console voor oven, verzinkt" }, // bewust genegeerd
    { omschrijving: "afstandsbediening, wit" }, // led-toebehoren: bewust genegeerd
    { omschrijving: "theedoek, grijs" }, // geen montagewerk
  ]);
  const r = bomNaarTelling(bom, producten);
  const niet = r.telling.aannames.filter((a) => a.startsWith("Niet herkend"));
  const nr = (soort: string) => r.artikelen.find((a) => a.soort === soort)!.artikelnummer;
  assert.deepEqual(niet.sort(), [
    `Niet herkend, controleren: open opberger (${nr("open opberger")})`,
    `Niet herkend, controleren: wandrek (${nr("wandrek")})`,
  ].sort());
});

test("vangnet: een complete keuken met alle getelde soorten geeft geen 'Niet herkend'", () => {
  const t = tellingVan([
    ...kasten,
    ...apparaten,
    { omschrijving: "werkblad, eikeneffect/laminaat", breedteMm: 2460, diepteMm: 635, sectie: "linears" },
    { omschrijving: "led-strip voor keukenwerkblad, dimbaar wit" },
    { omschrijving: "wandpaneel op maat, wit", breedteMm: 1200, sectie: "linears" },
  ]);
  assert.ok(!t.aannames.some((a) => /Niet herkend/.test(a)), t.aannames.join(" | "));
});

test("eigen apparaten (ASL-posities): positie zonder apparaat → aanname per apparaat", () => {
  const t = tellingVan([
    { omschrijving: "ladefront, wit", positie: "Vaatwasser met 2 ladefronten" },
    { omschrijving: "hoge kast voor inbouwapparatuur, wit", positie: "Hoge kast voor oven met planken" },
    { omschrijving: "hoge kast voor inbouwapparatuur, wit", positie: "Hoge kast voor koelkast en vriezer" },
    { omschrijving: "onderkast v inbouwapp/spoelbak, wit", positie: "Onderkast voor kookplaat met lades" },
    { omschrijving: "onderkast, wit", positie: "Onderkast met lades" },
  ]);
  for (const a of ["vaatwasser", "oven", "koelkast/vriezer", "kookplaat"]) assert.ok(t.aannames.includes(eigen(a)), a);
});

test("eigen apparaten (ASL-posities): met apparaat geen aanname; 'bovenkast' is geen oven; Engelse namen", () => {
  const t = tellingVan([
    { omschrijving: "inbouwvaatwasser, IKEA 500", positie: "Vaatwasser met 2 ladefronten" },
    { omschrijving: "heteluchtoven, zwart", positie: "Hoge kast voor oven met planken" },
    { omschrijving: "hoge kast voor inbouwapparatuur, wit", positie: "Hoge kast voor oven met planken" },
    { omschrijving: "inductiekookplaat, zwart", positie: "Onderkast voor kookplaat met lades" },
    { omschrijving: "bovenkast, wit", positie: "Bovenkast met planken" },
  ]);
  assert.ok(!t.aannames.some((a) => a.startsWith("Geen ")), t.aannames.join(" | "));

  const engels = tellingVan([
    { omschrijving: "hoge kast voor inbouwapparatuur, wit", positie: "High cabinet for fridge and freezer" },
    { omschrijving: "onderkast, wit", positie: "Onderkast met lades" },
  ]);
  assert.ok(engels.aannames.includes(eigen("koelkast/vriezer")));
});

test("eigen apparaten (ASL-posities): twee ovenposities, één oven → aanname", () => {
  const t = tellingVan([
    { omschrijving: "heteluchtoven, zwart", positie: "Hoge kast voor oven met planken" },
    { omschrijving: "hoge kast voor inbouwapparatuur, wit", positie: "Hoge kast voor oven en magnetron" },
  ]);
  assert.ok(t.aannames.includes(eigen("oven")));
});

test("eigen apparaten zonder ASL-namen: terugval op de ART-regels", () => {
  // front voor vaatwasser zonder vaatwasser
  assert.ok(tellingVan([{ omschrijving: "onderkast, wit" }, { omschrijving: "front voor vaatwasser, wit" }]).aannames.includes(eigen("vaatwasser")));
  // console voor oven zonder oven
  assert.ok(tellingVan([{ omschrijving: "onderkast, wit" }, { omschrijving: "console voor oven, verzinkt" }]).aannames.includes(eigen("oven")));
  // hoge kast inbouwapp zonder apparaten: oven én koelkast
  const leeg = tellingVan([{ omschrijving: "hoge kast voor inbouwapparatuur, wit" }]);
  assert.ok(leeg.aannames.includes(eigen("oven")));
  assert.ok(leeg.aannames.includes(eigen("koelkast/vriezer")));
  // de kast is verklaard door de oven: geen koelkast-aanname
  const metOven = tellingVan([{ omschrijving: "hoge kast voor inbouwapparatuur, wit" }, { omschrijving: "heteluchtoven, zwart" }]);
  assert.ok(!metOven.aannames.some((a) => a.startsWith("Geen ")), metOven.aannames.join(" | "));
  // twee hoge kasten, één oven, geen koelkast
  assert.ok(tellingVan([{ omschrijving: "hoge kast voor inbouwapparatuur, wit", aantal: 2 }, { omschrijving: "heteluchtoven, zwart" }]).aannames.includes(eigen("koelkast/vriezer")));
  // onderkast v inbouwapp zonder kookplaat (en meer dan het aantal spoelbakken)
  const kook = tellingVan([
    { omschrijving: "onderkast v inbouwapp/spoelbak, wit", aantal: 2 },
    { omschrijving: "inbouwspoelbak, 1 bak" },
  ]);
  assert.ok(kook.aannames.includes(eigen("kookplaat")));
  const alleenSpoel = tellingVan([{ omschrijving: "onderkast v inbouwapp/spoelbak, wit" }, { omschrijving: "inbouwspoelbak, 1 bak" }]);
  assert.ok(!alleenSpoel.aannames.includes(eigen("kookplaat")));
});

// ---------------------------------------------------------------------------
// Eiland (opstelling)
// ---------------------------------------------------------------------------

const EILAND_MET = (wat: string, aansluiting: string) => `Eiland met ${wat}: ${aansluiting} vóór de montage in de vloer liggen.`;
const EILAND_DROOG = "Eiland/vrijstaand blok in het ontwerp.";
const FRAME_ZONDER_EILAND = "Verankeringsframe voor kookeiland besteld, maar geen eiland in het ontwerp: te veel besteld?";
const EILAND_ZONDER_FRAME = "Eiland zonder verankeringsframe: controleren of dat nodig is.";
const eilandAannames = (a: string[]) => a.filter((x) => /eiland/i.test(x));

// Ruimte van 4 × 3 m; een kast tegen de muur staat met zijn midden ±375 mm van de muur.
const kamer: Opstelling["muren"] = [[[0, 0], [4000, 0]], [[4000, 0], [4000, 3000]], [[4000, 3000], [0, 3000]], [[0, 3000], [0, 0]]];
const op = (...posities: [string, number, number, boolean?][]): Opstelling => ({
  muren: kamer,
  posities: posities.map(([uuid, x, y, ruggelings]) => ({ uuid, x, y, ruggelings: !!ruggelings })),
});
const metOpstelling = (items: Item[], opstelling: Opstelling | null) => {
  const { bom, producten } = maakBom(items);
  return bomNaarTelling(bom, producten, { opstelling }).telling;
};
const FRAME: Item = { omschrijving: "verankeringsframe voor kookeiland" };

test("eiland, ruggelings, met spoelbak + frame: alleen de water-aanname", () => {
  const t = metOpstelling(
    [
      { omschrijving: "onderkast v inbouwapp/spoelbak, wit", positie: "Onderkast voor spoelbak" },
      { omschrijving: "inbouwspoelbak, 1 bak", positie: "Onderkast voor spoelbak" },
      { omschrijving: "onderkast, wit", positie: "Onderkast met lades" },
      FRAME,
    ],
    op(["Onderkast voor spoelbak", 2000, 1500, true], ["Onderkast met lades", 2000, 375])
  );
  assert.equal(t.eiland, 1);
  assert.deepEqual(eilandAannames(t.aannames), [EILAND_MET("spoelbak", "water en afvoer moeten")]);
});

test("eiland, vrijstaand (> 80 cm van elke muur), met spoelbak en kookplaat, zonder frame", () => {
  const t = metOpstelling(
    [
      { omschrijving: "inbouwspoelbak, 1 bak", positie: "Onderkast voor spoelbak" },
      { omschrijving: "inductiekookplaat, zwart", positie: "Onderkast voor kookplaat" },
      { omschrijving: "onderkast v inbouwapp/spoelbak, wit", positie: "Onderkast voor kookplaat" },
    ],
    op(["Onderkast voor spoelbak", 1600, 1500], ["Onderkast voor kookplaat", 2200, 1500])
  );
  assert.equal(t.eiland, 1);
  assert.deepEqual(eilandAannames(t.aannames), [EILAND_MET("spoelbak en kookplaat", "water, afvoer en stroom moeten"), EILAND_ZONDER_FRAME]);
});

test("eiland met alleen een kookplaat: stroom (Perilex)", () => {
  const t = metOpstelling(
    [{ omschrijving: "inductiekookplaat, zwart", positie: "Onderkast voor kookplaat" }, FRAME],
    op(["Onderkast voor kookplaat", 2000, 1500, true])
  );
  assert.deepEqual(eilandAannames(t.aannames), [EILAND_MET("kookplaat", "stroom (Perilex) moet")]);
});

test("eiland met alleen een vaatwasser: water en afvoer", () => {
  const t = metOpstelling(
    [{ omschrijving: "inbouwvaatwasser, IKEA 500", positie: "Vaatwasser met 2 ladefronten" }, FRAME],
    op(["Vaatwasser met 2 ladefronten", 2000, 1500, true])
  );
  assert.deepEqual(eilandAannames(t.aannames), [EILAND_MET("vaatwasser", "water en afvoer moeten")]);
});

test("eiland met vaatwasser en kookplaat: water, afvoer en stroom", () => {
  const t = metOpstelling(
    [
      { omschrijving: "inbouw vaatwasser, IKEA 500", positie: "Vaatwasser met 2 ladefronten" },
      { omschrijving: "inductiekookplaat, zwart", positie: "Onderkast voor kookplaat" },
      FRAME,
    ],
    op(["Vaatwasser met 2 ladefronten", 1800, 1500, true], ["Onderkast voor kookplaat", 2400, 1500, true])
  );
  assert.deepEqual(eilandAannames(t.aannames), [EILAND_MET("vaatwasser en kookplaat", "water, afvoer en stroom moeten")]);
});

test("eiland zonder spoelbak/kookplaat (die staan tegen de muur): droog eiland", () => {
  const t = metOpstelling(
    [
      { omschrijving: "onderkast, wit", positie: "Onderkast met lades" },
      { omschrijving: "inbouwspoelbak, 1 bak", positie: "Onderkast voor spoelbak" },
      FRAME,
    ],
    op(["Onderkast met lades", 2000, 1500], ["Onderkast voor spoelbak", 2000, 375])
  );
  assert.equal(t.eiland, 1);
  assert.deepEqual(eilandAannames(t.aannames), [EILAND_DROOG]);
});

test("frame, alles tegen de muur (ook een hoekkast op 51 cm): geen eiland, te veel besteld?", () => {
  const t = metOpstelling(
    [{ omschrijving: "onderkast, wit", positie: "Onderkast met lades" }, { omschrijving: "hoekonderkast, wit", positie: "Onderhoekkast" }, FRAME],
    op(["Onderkast met lades", 2000, 375], ["Onderhoekkast", 512, 512])
  );
  assert.equal(t.eiland, 0);
  assert.deepEqual(eilandAannames(t.aannames), [FRAME_ZONDER_EILAND]);
});

test("geen eiland en geen frame: geen eiland-aanname", () => {
  const t = metOpstelling([{ omschrijving: "onderkast, wit", positie: "Onderkast met lades" }], op(["Onderkast met lades", 2000, 375]));
  assert.equal(t.eiland, 0);
  assert.deepEqual(eilandAannames(t.aannames), []);
});

test("leesOpstelling: muren en kastposities uit appData.projectInfo; zonder projectInfo null", () => {
  const projectInfo = {
    walls: [{ startPoint: { x: 0, y: 0 }, endPoint: { x: 4000, y: 0 } }],
    products: [
      { uuid: "A", transfo: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100, 375, 0, 1], contextParameters: [{ id: "isBackToBack", val: true }] },
      { uuid: "B", transfo: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 9, 9, 0, 1], contextParameters: [{ id: "plinth", val: "x" }] }, // geen kast
    ],
  };
  const o = leesOpstelling({ appData: { projectInfo: JSON.stringify(projectInfo) } });
  assert.deepEqual(o, { muren: [[[0, 0], [4000, 0]]], posities: [{ uuid: "A", x: 100, y: 375, ruggelings: true }] });
  assert.equal(leesOpstelling({ appData: {} }), null);
  assert.equal(leesOpstelling({ appData: { projectInfo: "{kapot" } }), null);
});

// Eigen ontwerp van Ilja met een bevestigd eiland (ruggelings).
test("fixture 36FDA15A: eiland, zonder spoelbak/kookplaat erin, frame besteld", () => {
  const f = lees("eiland-36FDA15A.json");
  const r = bomNaarTelling(f.bom, f.producten, { opstelling: f.opstelling });
  assert.equal(r.telling.eiland, 1);
  assert.deepEqual(eilandAannames(r.telling.aannames), [EILAND_DROOG]);
});

// Klantontwerpen uit de spike: staan NIET in git (geen klantdata). Draaien alleen
// lokaal als spikes/ikea-planner/data er is.
const SPIKE = new URL("../../../spikes/ikea-planner/data/", import.meta.url);
const spikeOntwerp = (prefix: string) => {
  const map = new URL("raw/", SPIKE);
  const f = existsSync(map) ? readdirSync(map).find((x) => x.startsWith(prefix)) : undefined;
  if (!f) return null;
  const raw = JSON.parse(readFileSync(new URL(f, map), "utf8"));
  const cache = JSON.parse(readFileSync(new URL("productcache.json", SPIKE), "utf8"));
  const producten: Record<string, ProductInfo> = {};
  for (const [id, p] of Object.entries<Record<string, string>>(cache)) {
    producten[id] = { dbId: id, artikelnummer: null, referentie: p.referentie ?? null, naam: p.naam ?? "", omschrijving: p.omschrijving ?? "",
      maat: null, breedte: null, diepte: null, hoogte: null, leverbaar: true, eindDatum: null };
  }
  return bomNaarTelling(raw.bom, producten, { opstelling: leesOpstelling({ appData: raw.appData }) }).telling;
};
const spikeAanwezig = existsSync(new URL("raw/", SPIKE));

test("spike 9C9EB523 (bevestigd eiland): vrijstaand blok met kookplaat", { skip: !spikeAanwezig && "spike-data niet lokaal" }, () => {
  const t = spikeOntwerp("9C9EB523")!;
  assert.equal(t.eiland, 1);
  assert.deepEqual(eilandAannames(t.aannames), [EILAND_MET("kookplaat", "stroom (Perilex) moet")]);
});

test("spike 62ED0CF3 (geen eiland, wel frame): te veel besteld?", { skip: !spikeAanwezig && "spike-data niet lokaal" }, () => {
  const t = spikeOntwerp("62ED0CF3")!;
  assert.equal(t.eiland, 0);
  assert.deepEqual(eilandAannames(t.aannames), [FRAME_ZONDER_EILAND]);
});
