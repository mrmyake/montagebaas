// BOM lezen, productgegevens en foutcategorieën. Draaien: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { artikelenUitBom, bomIds, bomRegels, leesBom, prijscontrole, referentieIds } from "./bom.ts";
import { PlannerFout, classificeerHttp, isTijdelijkeStatus, naarPlannerFout } from "./fouten.ts";
import { naarArtikelnummer, productUitApi, type ProductInfo } from "./product.ts";

const art = (nr: string, extra: Record<string, unknown> = {}) => ({
  dbID: `ART-${nr}-NL`,
  quantity: 1,
  price: { current: { value: 10 } },
  ...extra,
});

const metadata = (bom: unknown) => ({ appData: { bom: typeof bom === "string" ? bom : JSON.stringify(bom) } });

function verwachtStructuurFout(fn: () => unknown) {
  assert.throws(fn, (e: unknown) => e instanceof PlannerFout && e.categorie === "onverwachte_structuur");
}

// ---- leesBom: structuurcontrole ----

test("leesBom: geldige BOM → bom + exacte string", () => {
  const ruw = JSON.stringify({ products: [art("40591703")] });
  const { bom, bomRuw } = leesBom({ appData: { bom: ruw } });
  assert.equal(bomRuw, ruw);
  assert.equal(bom.products.length, 1);
});

test("leesBom: appData.bom ontbreekt → onverwachte_structuur", () => {
  verwachtStructuurFout(() => leesBom({}));
  verwachtStructuurFout(() => leesBom({ appData: {} }));
  verwachtStructuurFout(() => leesBom(null));
});

test("leesBom: bom als object i.p.v. string → onverwachte_structuur", () => {
  verwachtStructuurFout(() => leesBom({ appData: { bom: { products: [] } } }));
});

test("leesBom: geen JSON → onverwachte_structuur", () => {
  verwachtStructuurFout(() => leesBom(metadata("{niet json")));
});

test("leesBom: geen products[] → onverwachte_structuur", () => {
  verwachtStructuurFout(() => leesBom(metadata({ items: [] })));
});

test("leesBom: geen geprijsde ART-regels → onverwachte_structuur", () => {
  verwachtStructuurFout(() => leesBom(metadata({ products: [] })));
  verwachtStructuurFout(() => leesBom(metadata({ products: [{ dbID: "ASL-1-NL" }, art("12345678", { price: {} })] })));
});

// ---- bomRegels / prijscontrole ----

test("bomRegels: geneste children/packs, maatwerk in meters/m², ASL genegeerd", () => {
  const bom = {
    products: [
      {
        dbID: "ASL-42460274-NL",
        children: [art("00000001", { quantity: 2 }), { dbID: "ASM-1-NL", packs: [art("00000002", { quantity: 3 })] }],
      },
    ],
    linears: [
      { dbID: "EXT-00000003-NL", linear: 2.46, price: { current: { value: 50, additionalData: { pricingMethod: "linearMeter" } } } },
      { dbID: "EXT-00000004-NL", square: 1.5, price: { current: { value: 40, additionalData: { pricingMethod: "squareMeter" } } } },
      { dbID: "EXT-00000005-NL", front: true, linear: 2.46 }, // ongeprijsde voorkantrand
    ],
    totalPrice: { current: 20 + 30 + 123 + 60 },
  };
  const regels = bomRegels(bom);
  assert.deepEqual(
    regels.map((r) => [r.dbId, r.aantal, r.prijs]),
    [
      ["ART-00000001-NL", 2, 10],
      ["ART-00000002-NL", 3, 10],
      ["EXT-00000003-NL", 2.46, 50],
      ["EXT-00000004-NL", 1.5, 40],
      ["EXT-00000005-NL", 1, null], // geen prijsmethode → telt als stuk, maar valt buiten de lijst
    ]
  );
  assert.deepEqual(bomIds(bom), ["ART-00000001-NL", "ART-00000002-NL", "EXT-00000003-NL", "EXT-00000004-NL"]);
  assert.deepEqual(prijscontrole(bom), { som: 233, totaal: 233, verschil: 0 });
});

// ---- artikelenUitBom ----

const info = (dbId: string, omschrijving: string, extra: Partial<ProductInfo> = {}): ProductInfo => ({
  dbId,
  artikelnummer: naarArtikelnummer(dbId),
  referentie: null,
  naam: "METOD",
  omschrijving,
  maat: null,
  breedte: null,
  diepte: null,
  hoogte: null,
  leverbaar: true,
  eindDatum: null,
  ...extra,
});

test("artikelenUitBom: telt per ART-nummer op, EXT via referentie met EXT-omschrijving", () => {
  const bom = {
    products: [art("40591703", { quantity: 2 }), art("40591703")],
    linears: [{ dbID: "EXT-42465223-NL", linear: 2.4, price: { current: { value: 50, additionalData: { pricingMethod: "linearMeter" } } } }],
  };
  const producten: Record<string, ProductInfo> = {
    "ART-40591703-NL": info("ART-40591703-NL", "onderkast, zwartgrijs", { maat: "60x60x80 cm" }),
    "EXT-42465223-NL": info("EXT-42465223-NL", "maatwerkblad, eikenpatroon/laminaat", { naam: "EKBACKEN", referentie: "ART-40494698-NL" }),
  };
  assert.deepEqual(referentieIds(bom, producten), ["ART-40494698-NL"]);
  const lijst = artikelenUitBom(bom, producten);
  assert.deepEqual(
    lijst.map((a) => [a.artikelnummer, a.naam, a.omschrijving, a.soort, a.aantal]),
    [
      ["404.946.98", "EKBACKEN", "maatwerkblad, eikenpatroon/laminaat", "maatwerkblad", 2.4],
      ["405.917.03", "METOD", "onderkast, zwartgrijs, 60x60x80 cm", "onderkast", 3],
    ]
  );
});

test("artikelenUitBom: EXT zonder referentie → onverwachte_structuur", () => {
  const bom = { products: [{ dbID: "EXT-1-NL", price: { current: { value: 1 } } }] };
  verwachtStructuurFout(() => artikelenUitBom(bom, {}));
});

// ---- productUitApi ----

const NU = new Date("2026-10-24T12:00:00Z");
const apiProduct = (extra: Record<string, unknown> = {}, def: Record<string, unknown> = {}) => ({
  availability: 1,
  definition: { name: "METOD", shortDescription: "onderkast, zwartgrijs", reference: "ART-40591703", endDate: "3000-01-01T00:00:00.000Z", ...def },
  parameters: { definition: { commercialDimensions: { defaultValue: " 60x60x80 cm " }, width: { defaultValue: 60 } } },
  ...extra,
});

test("productUitApi: velden, maat getrimd, referentie met -NL", () => {
  const p = productUitApi("ART-40591703-NL", apiProduct(), NU);
  assert.equal(p.artikelnummer, "405.917.03");
  assert.equal(p.referentie, "ART-40591703-NL");
  assert.equal(p.naam, "METOD");
  assert.equal(p.omschrijving, "onderkast, zwartgrijs");
  assert.equal(p.maat, "60x60x80 cm");
  assert.equal(p.breedte, 60);
  assert.equal(p.diepte, null);
  assert.equal(p.leverbaar, true);
});

test("productUitApi: einddatum voorbij of availability ≠ 1 → niet leverbaar", () => {
  assert.equal(productUitApi("ART-1-NL", apiProduct({}, { endDate: "2026-10-01T00:00:00.000Z" }), NU).leverbaar, false);
  assert.equal(productUitApi("ART-1-NL", apiProduct({ availability: 0 }), NU).leverbaar, false);
  assert.equal(productUitApi("ART-1-NL", apiProduct({ availability: undefined }), NU).leverbaar, null);
});

test("productUitApi: lege/rare input crasht niet", () => {
  const p = productUitApi("EXT-1-NL", null, NU);
  assert.equal(p.naam, "");
  assert.equal(p.artikelnummer, null);
  assert.equal(p.leverbaar, null);
});

// ---- foutcategorieën ----

test("classificeerHttp: 404 en BM_201 → niet_gevonden", () => {
  assert.equal(classificeerHttp(404, '{"id":"BM_201","message":"Project does not exist or wrong format"}', "project").categorie, "niet_gevonden");
  assert.equal(classificeerHttp(400, '{"id":"BM_201"}', "project").categorie, "niet_gevonden");
});

test("classificeerHttp: 403/429/500 → ikea_fout", () => {
  assert.equal(classificeerHttp(403, '{"id":"BM_0014","message":"User Role not accepted"}', "metadata/2").categorie, "ikea_fout");
  assert.equal(classificeerHttp(403, "<html>cloudflare challenge</html>", "csrf").categorie, "ikea_fout");
  assert.equal(classificeerHttp(429, "", "products").categorie, "ikea_fout");
  assert.equal(classificeerHttp(500, "Internal server error", "legal-entity-token").categorie, "ikea_fout");
});

test("classificeerHttp: bericht bevat stap, status en (ingekorte) body", () => {
  const f = classificeerHttp(500, "x".repeat(500), "metadata/2");
  assert.match(f.message, /^metadata\/2 500: x+$/);
  assert.ok(f.message.length < 230);
});

test("isTijdelijkeStatus: alleen 5xx", () => {
  assert.equal(isTijdelijkeStatus(500), true);
  assert.equal(isTijdelijkeStatus(503), true);
  assert.equal(isTijdelijkeStatus(429), false);
  assert.equal(isTijdelijkeStatus(404), false);
});

test("naarPlannerFout: laat PlannerFout staan, rest wordt ikea_fout", () => {
  const f = new PlannerFout("timeout", "x");
  assert.equal(naarPlannerFout(f), f);
  assert.equal(naarPlannerFout(new Error("boem")).categorie, "ikea_fout");
  assert.equal(naarPlannerFout("tekst").message, "tekst");
});
