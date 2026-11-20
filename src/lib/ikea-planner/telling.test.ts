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
  assert.ok(t.aannames.some((a) => /op locatie zagen, toeslag zit NIET in de berekende prijs/.test(a))); // bedrag staat in de tarieven
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

// ---------------------------------------------------------------------------
// BOM zonder prijzen (IKEA levert tijdelijk geen prijzen): tellen op dbID + quantity
// ---------------------------------------------------------------------------

test("BOM zonder prijzen: telt op artikelnummer, aanname, vertrouwen hoog", () => {
  const nr = (n: string) => `ART-${n}-NL`;
  const regel = (n: string, quantity: number) => ({ dbID: nr(n), quantity });
  const bom = {
    products: [
      { dbID: "ASL-1-NL", children: [regel("10000001", 4), regel("10000002", 2), regel("10000003", 1)] },
      { dbID: "ASL-2-NL", children: [regel("10000004", 9), regel("10000005", 20)] },
      // hoekkasten en afzuigkast tellen als frame; EXT-frame zonder prijs op stuks, plank negeren
      { dbID: "ASL-3-NL", children: [regel("10000006", 1), regel("10000007", 1), regel("10000008", 2), regel("10000009", 2)] },
      { dbID: "ASL-4-NL", children: [{ dbID: "EXT-20000001-NL" }, { dbID: "EXT-20000001-NL" }, { dbID: "EXT-20000002-NL", front: true, linear: 2.4 }] },
    ],
  };
  const info = (n: string, omschrijving: string): ProductInfo => ({
    dbId: nr(n), artikelnummer: null, referentie: null, naam: "METOD", omschrijving, maat: null,
    breedte: null, diepte: null, hoogte: null, leverbaar: true, eindDatum: null,
  });
  const prod: Record<string, ProductInfo> = {
    [nr("10000001")]: info("10000001", "onderkast, zwartgrijs"),
    [nr("10000002")]: info("10000002", "bovenkast, zwartgrijs"),
    [nr("10000003")]: info("10000003", "hoge kast, zwartgrijs"),
    [nr("10000004")]: info("10000004", "lade, zwartgrijs"),
    [nr("10000005")]: info("10000005", "scharnier"),
    [nr("10000006")]: info("10000006", "bovenhoekkast, wit"),
    [nr("10000007")]: info("10000007", "wandkast voor ingebouwde afzuigkap, wit"),
    [nr("10000008")]: info("10000008", "bovenkast, wit"),
    [nr("10000009")]: info("10000009", "plank bovenhoekkastelement, wit"),
    "EXT-20000001-NL": {
      ...info("20000001", "frame voor onderhoekkast, zwartgrijs"),
      dbId: "EXT-20000001-NL",
      referentie: nr("10000010"),
    },
    [nr("10000010")]: info("10000010", "hoekonderkast, zwartgrijs"),
  };
  const { bom: gelezen } = leesBom({ appData: { bom: JSON.stringify(bom) } });
  const { telling, prijscontrole } = bomNaarTelling(gelezen, prod);
  assert.equal(telling.onderkasten, 6);
  assert.equal(telling.bovenkasten, 6);
  assert.equal(telling.hoge_kasten, 1);
  assert.equal(telling.lade_elementen, 9);
  assert.equal(telling.vertrouwen, "hoog");
  assert.ok(telling.aannames.includes("IKEA-prijzen niet beschikbaar voor 11 artikelregel(s), telling op artikelnummers"));
  assert.equal(prijscontrole.verschil, null);
  assert.ok(!telling.aannames.some((a) => /Prijscontrole/.test(a)));
  assert.equal(valideerTelling(telling).ok, true);

  // Onbekend montagewerk-artikel zonder prijzen: vertrouwen zakt.
  const onbekend = { ...prod, [nr("10000005")]: info("10000005", "mysterieuze kastmodule") };
  assert.equal(bomNaarTelling(gelezen, onbekend).telling.vertrouwen, "gemiddeld");
});

test("gemengde BOM: regel zonder prijs telt mee, één aanname, prijscontrole verschil null", () => {
  const info = (id: string, omschrijving: string): ProductInfo => ({
    dbId: id, artikelnummer: null, referentie: null, naam: "METOD", omschrijving, maat: null,
    breedte: null, diepte: null, hoogte: null, leverbaar: true, eindDatum: null,
  });
  const prijs = { current: { value: 10 } };
  const bom = {
    products: [
      { dbID: "ASL-1-NL", children: [
        { dbID: "ART-10000001-NL", quantity: 3, price: prijs },
        { dbID: "ART-10000002-NL", quantity: 2 }, // zonder prijs: telt mee
        { dbID: "EXT-20000001-NL", quantity: 1 }, // EXT op stuks zonder prijs: telt mee
        { dbID: "EXT-20000002-NL", front: true, linear: 2.4 }, // ongeprijsde voorkantrand: niet
      ] },
    ],
    totalPrice: { current: 30 },
  };
  const prod: Record<string, ProductInfo> = {
    "ART-10000001-NL": info("ART-10000001-NL", "onderkast, zwartgrijs"),
    "ART-10000002-NL": info("ART-10000002-NL", "bovenkast, wit"),
    "EXT-20000001-NL": { ...info("EXT-20000001-NL", "frame voor onderhoekkast"), referentie: "ART-10000003-NL" },
    "ART-10000003-NL": info("ART-10000003-NL", "hoekonderkast, zwartgrijs"),
  };
  const { bom: gelezen } = leesBom({ appData: { bom: JSON.stringify(bom) } });
  const { telling, prijscontrole } = bomNaarTelling(gelezen, prod);
  assert.equal(telling.onderkasten, 4);
  assert.equal(telling.bovenkasten, 2);
  assert.equal(prijscontrole.verschil, null);
  const prijsAannames = telling.aannames.filter((a) => /IKEA-prijzen/.test(a));
  assert.deepEqual(prijsAannames, ["IKEA-prijzen niet beschikbaar voor 2 artikelregel(s), telling op artikelnummers"]);
  assert.ok(!telling.aannames.some((a) => /Prijscontrole/.test(a)));
});

test("ongeprijsd EXT-frame: echte structuur van een onderhoekkast (alleen de relevante regels uit een echt ontwerp, geen klantgegevens)", () => {
  // Positie "Onderhoekkast met uittrekbare inrichting" zoals IKEA hem levert zonder prijzen:
  // kaal EXT-frame (geen quantity, geen price) en kale ART-inrichting in geneste ASM's.
  const bom = {
    locale: "nl-NL",
    products: [
      {
        dbID: "ASL-42468424-NL",
        packs: [{ dbID: "ART-80607373-NL", quantity: 1 }],
        children: [
          { dbID: "ASM-42468379-NL", children: [{ dbID: "EXT-42468339-NL" }, { dbID: "ASM-42460598-NL" }] },
          { dbID: "ASM-42468386-NL", children: [{ dbID: "ART-40596791-NL" }] },
        ],
      },
      // tweede identieke positie: aantal 2
      {
        dbID: "ASL-42468424-NL",
        packs: [{ dbID: "ART-80607373-NL", quantity: 1 }],
        children: [
          { dbID: "ASM-42468379-NL", children: [{ dbID: "EXT-42468339-NL" }] },
          { dbID: "ASM-42468386-NL", children: [{ dbID: "ART-40596791-NL" }] },
          { dbID: "ART-90213573-AE" }, // ander land dan nl-NL: overslaan
        ],
      },
    ],
  };
  const pi = (dbId: string, omschrijving: string, extra: Partial<ProductInfo> = {}): ProductInfo => ({
    dbId, artikelnummer: null, referentie: null, naam: "METOD", omschrijving, maat: null,
    breedte: null, diepte: null, hoogte: null, leverbaar: true, eindDatum: null, ...extra,
  });
  const prod: Record<string, ProductInfo> = {
    "EXT-42468339-NL": pi("EXT-42468339-NL", "frame voor onderhoekkast, zwartgrijs", { referentie: "ART-30591685-NL", maat: "128x68x80 cm" }),
    "ART-30591685-NL": pi("ART-30591685-NL", "hoekonderkast, zwartgrijs", { referentie: "ART-30591685-NL", maat: "128x60x80 cm" }),
    "ART-40596791-NL": pi("ART-40596791-NL", "inrichting onderhoekkast, uittrekb, grijs", { naam: "UTRUSTA" }),
    "ART-80607373-NL": pi("ART-80607373-NL", "scharnier voor keukenhoekkast, met ingebouwde demper", { naam: "UTRUSTA" }),
  };
  const { bom: gelezen, overgeslagen } = leesBom({ appData: { bom: JSON.stringify(bom) } });
  const { telling } = bomNaarTelling(gelezen, prod);
  assert.equal(telling.onderkasten, 2); // 2 EXT-frames, het ART-frame bestaat niet los: niet dubbel
  assert.equal(telling.binneninrichting, 2);
  assert.equal(telling.vertrouwen, "hoog");
  assert.deepEqual(overgeslagen, [{ dbID: "ART-90213573-AE", reden: "ander land: AE, BOM is NL" }]);
  assert.equal(telling.aannames.filter((a) => /IKEA-prijzen/.test(a)).length, 1);
});

test("vertrouwen zakt alleen als hetzelfde artikel ongeprijsd én niet herkend is", () => {
  const pi = (dbId: string, omschrijving: string): ProductInfo => ({
    dbId, artikelnummer: null, referentie: null, naam: "X", omschrijving, maat: null,
    breedte: null, diepte: null, hoogte: null, leverbaar: true, eindDatum: null,
  });
  const maak = (ongeprijsdeOmschr: string, geprijsdeOmschr: string) => {
    const bom = { locale: "nl-NL", products: [{ dbID: "ASL-1-NL", children: [
      { dbID: "ART-10000001-NL", quantity: 1, price: { current: { value: 10 } } },
      { dbID: "ART-10000002-NL", quantity: 1 },
    ] }], totalPrice: { current: 10 } };
    const prod = { "ART-10000001-NL": pi("ART-10000001-NL", geprijsdeOmschr), "ART-10000002-NL": pi("ART-10000002-NL", ongeprijsdeOmschr) };
    return bomNaarTelling(leesBom({ appData: { bom: JSON.stringify(bom) } }).bom, prod).telling.vertrouwen;
  };
  assert.equal(maak("onderkast, wit", "mysterieuze kastmodule"), "hoog"); // niet-herkend artikel is wél geprijsd
  assert.equal(maak("mysterieuze kastmodule", "onderkast, wit"), "gemiddeld"); // ongeprijsd én niet herkend
});

test("ongeprijsd EXT-maatwerk (linear/square) met eigen landsuffix: één aanname en vertrouwen gemiddeld; front en ander land niet", () => {
  const pi = (dbId: string, omschrijving: string): ProductInfo => ({
    dbId, artikelnummer: null, referentie: null, naam: "METOD", omschrijving, maat: null,
    breedte: null, diepte: null, hoogte: null, leverbaar: true, eindDatum: null,
  });
  const prod = { "ART-10000001-NL": pi("ART-10000001-NL", "onderkast, wit") };
  // zonder prijzen: ook de kast is ongeprijsd
  const maak = (extra: unknown[], prijs = false) => {
    const kast = prijs ? { dbID: "ART-10000001-NL", quantity: 1, price: { current: { value: 10 } } } : { dbID: "ART-10000001-NL", quantity: 1 };
    const bom = { locale: "nl-NL", products: [{ dbID: "ASL-1-NL", children: [kast] }], linears: extra };
    const { bom: b, overgeslagen } = leesBom({ appData: { bom: JSON.stringify(bom) } });
    return { telling: bomNaarTelling(b, prod).telling, overgeslagen };
  };
  const aanname = (t: { aannames: string[] }) => t.aannames.filter((a) => /^Maatwerk zonder prijs/.test(a));

  const t = maak([
    { dbID: "EXT-30000002-NL", linear: 1.2 },
    { dbID: "EXT-30000003-NL", square: 0.5 },
    { dbID: "EXT-30000001-NL", front: true, linear: 2.4 }, // voorkantrand: telt niet mee in N
  ]);
  assert.deepEqual(aanname(t.telling), ["Maatwerk zonder prijs niet meegeteld (2 regels), werkblad en maatwerk controleren"]);
  assert.equal(t.telling.vertrouwen, "gemiddeld");
  assert.equal(t.overgeslagen.length, 3); // alle drie blijven vastgelegd

  // alleen een voorkantrand (zonder prijzen): stil, vertrouwen hoog
  const alleenFront = maak([{ dbID: "EXT-30000001-NL", front: true, linear: 2.4 }]);
  assert.deepEqual(aanname(alleenFront.telling), []);
  assert.equal(alleenFront.telling.vertrouwen, "hoog");
  assert.equal(alleenFront.overgeslagen.length, 1);

  // normaal geprijsd ontwerp met voorkantrand: stil
  assert.equal(maak([{ dbID: "EXT-30000001-NL", front: true, linear: 2.4 }], true).telling.vertrouwen, "hoog");

  // ander landsuffix: geen aanname, wel vastgelegd
  const ander = maak([{ dbID: "EXT-30000009-DE", linear: 2.4 }]);
  assert.deepEqual(aanname(ander.telling), []);
  assert.equal(ander.telling.vertrouwen, "hoog");
  assert.equal(ander.overgeslagen.length, 1);
});
