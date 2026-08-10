// Tests voor de attributie-afvang. Draaien: `npm test`.
//
// De twee scenario's die ertoe doen:
//  1. de attributie overleeft de navigatie van landingspagina naar formulier;
//  2. een later direct bezoek wist een eerder opgeslagen gclid NIET.
//
// Er komt geen browser aan te pas: de cookie wordt nagebootst met een neppe
// jar, en zowel de client-kant (volgendeCookieWaarde) als de server-kant
// (attributieVoorInsert) draaien tegen diezelfde jar. Dat is precies de weg
// die de echte waarde ook aflegt.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ATTRIBUTIE_COOKIE,
  attributieVoorInsert,
  leesUitUrl,
  parseGaClientId,
  volgendeCookieWaarde,
} from "./attributie.ts";

/** Bootst zowel document.cookie (schrijven) als cookies() (lezen) na. */
class NepCookieJar {
  private waarden = new Map<string, string>();

  schrijf(naam: string, waarde: string): void {
    this.waarden.set(naam, waarde);
  }

  get(naam: string): { value: string } | undefined {
    const v = this.waarden.get(naam);
    return v === undefined ? undefined : { value: v };
  }
}

/**
 * Eén volledige paginalading, exact zoals AttributieCapture het doet:
 * waarde bepalen, en bij null de cookie met rust laten.
 */
function paginaLading(jar: NepCookieJar, href: string, referrer = ""): void {
  const waarde = volgendeCookieWaarde(href, referrer);
  if (waarde === null) return;
  jar.schrijf(ATTRIBUTIE_COOKIE, encodeURIComponent(waarde));
}

test("attributie overleeft de navigatie van landingspagina naar formulier", () => {
  const jar = new NepCookieJar();

  // 1. Bezoeker klikt op een advertentie en landt op een stadspagina.
  paginaLading(
    jar,
    "https://montagebaas.com/keukenmonteur/amsterdam?gclid=Cj0KCQ_TEST123&utm_source=google&utm_medium=cpc&utm_campaign=keuken-amsterdam",
    "https://www.google.com/"
  );

  // 2. Bezoeker navigeert door naar het formulier. Volledige paginalading,
  //    zonder parameters — dit is het moment waarop de attributie stuk zou gaan.
  paginaLading(jar, "https://montagebaas.com/offerte");

  // (Een client-side navigatie zou de component niet eens opnieuw mounten en
  //  raakt de cookie dus per definitie niet aan.)

  // 3. Server leest de cookie bij de insert.
  const attr = attributieVoorInsert(jar);

  assert.equal(attr.gclid, "Cj0KCQ_TEST123");
  assert.equal(attr.utm_source, "google");
  assert.equal(attr.utm_medium, "cpc");
  assert.equal(attr.utm_campaign, "keuken-amsterdam");
  assert.equal(
    attr.landing_page,
    "/keukenmonteur/amsterdam?gclid=Cj0KCQ_TEST123&utm_source=google&utm_medium=cpc&utm_campaign=keuken-amsterdam"
  );
  assert.equal(attr.referrer, "https://www.google.com/");
});

test("een later direct bezoek wist een eerder opgeslagen gclid niet", () => {
  const jar = new NepCookieJar();

  // Advertentieklik.
  paginaLading(jar, "https://montagebaas.com/?gclid=KLIK_EEN", "https://www.google.com/");
  assert.equal(attributieVoorInsert(jar).gclid, "KLIK_EEN");

  // Dagen later: bezoeker typt het adres in (geen referrer, geen parameters)
  // en klikt door naar het formulier. Beide mogen niets wissen.
  paginaLading(jar, "https://montagebaas.com/");
  paginaLading(jar, "https://montagebaas.com/offerte");

  const attr = attributieVoorInsert(jar);
  assert.equal(attr.gclid, "KLIK_EEN", "een direct bezoek mag de klik niet wissen");
  assert.equal(attr.referrer, "https://www.google.com/");
});

test("een organische terugkeer via Google wist de gclid ook niet", () => {
  const jar = new NepCookieJar();
  paginaLading(jar, "https://montagebaas.com/?gclid=KLIK_EEN", "https://www.google.com/");

  // Organisch zoekresultaat: wél een referrer, maar géén parameters in de URL.
  paginaLading(jar, "https://montagebaas.com/kosten", "https://www.google.com/");

  assert.equal(attributieVoorInsert(jar).gclid, "KLIK_EEN");
});

test("een nieuwe gclid wint wel van een oude", () => {
  const jar = new NepCookieJar();
  paginaLading(jar, "https://montagebaas.com/?gclid=KLIK_EEN");
  paginaLading(jar, "https://montagebaas.com/offerte?gclid=KLIK_TWEE");

  const attr = attributieVoorInsert(jar);
  assert.equal(attr.gclid, "KLIK_TWEE");
  assert.equal(attr.landing_page, "/offerte?gclid=KLIK_TWEE");
});

test("gbraid en wbraid worden net zo afgevangen als gclid", () => {
  const metGbraid = new NepCookieJar();
  paginaLading(metGbraid, "https://montagebaas.com/offerte?gbraid=BRAID_A");
  assert.equal(attributieVoorInsert(metGbraid).gbraid, "BRAID_A");

  const metWbraid = new NepCookieJar();
  paginaLading(metWbraid, "https://montagebaas.com/offerte?wbraid=BRAID_W");
  assert.equal(attributieVoorInsert(metWbraid).wbraid, "BRAID_W");

  // En ze overleven een navigatie zonder parameters, net als gclid.
  paginaLading(metGbraid, "https://montagebaas.com/offerte");
  assert.equal(attributieVoorInsert(metGbraid).gbraid, "BRAID_A");
});

test("er staat nooit meer dan één klik-identifier in het record", () => {
  const jar = new NepCookieJar();

  // Bezoek 1: gewone Search-klik.
  paginaLading(jar, "https://montagebaas.com/?gclid=KLIK_EEN");
  // Bezoek 2: iOS-klik, die een gbraid meestuurt in plaats van een gclid.
  paginaLading(jar, "https://montagebaas.com/?gbraid=BRAID_A");

  const attr = attributieVoorInsert(jar);
  assert.equal(attr.gbraid, "BRAID_A");
  assert.equal(
    attr.gclid,
    null,
    "de cookie wordt in zijn geheel vervangen, dus de oude gclid blijft niet naast de gbraid staan"
  );
  assert.equal(attr.wbraid, null);

  // Andersom net zo: een nieuwe gclid wist de gbraid.
  paginaLading(jar, "https://montagebaas.com/?gclid=KLIK_TWEE");
  const na = attributieVoorInsert(jar);
  assert.equal(na.gclid, "KLIK_TWEE");
  assert.equal(na.gbraid, null);
});

test("een utm-bezoek zonder gclid telt als nieuwe herkomst", () => {
  const jar = new NepCookieJar();
  paginaLading(jar, "https://montagebaas.com/?gclid=KLIK_EEN");

  // Last-non-direct-touch: een getagde nieuwsbriefklik is een nieuwe herkomst,
  // dus die vervangt de vorige (net als GA4 zelf doet).
  paginaLading(jar, "https://montagebaas.com/?utm_source=nieuwsbrief&utm_medium=email");

  const attr = attributieVoorInsert(jar);
  assert.equal(attr.utm_source, "nieuwsbrief");
  assert.equal(attr.gclid, null);
});

test("zonder cookie levert de insert overal null op, niet undefined", () => {
  const attr = attributieVoorInsert(new NepCookieJar());
  assert.deepEqual(attr, {
    gclid: null,
    gbraid: null,
    wbraid: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null,
    landing_page: null,
    referrer: null,
    ga_client_id: null,
  });
});

test("ga_client_id komt uit de _ga-cookie, en is null als die ontbreekt", () => {
  const metGa = new NepCookieJar();
  paginaLading(metGa, "https://montagebaas.com/?gclid=KLIK");
  metGa.schrijf("_ga", "GA1.1.1234567890.1700000000");
  assert.equal(attributieVoorInsert(metGa).ga_client_id, "1234567890.1700000000");

  // De bezoeker die gtag.js blokkeert: gclid werkt wél, ga_client_id blijft
  // leeg. Dat verschil is de noemer voor de omvang van de geblokkeerde groep.
  const zonderGa = new NepCookieJar();
  paginaLading(zonderGa, "https://montagebaas.com/?gclid=KLIK");
  const attr = attributieVoorInsert(zonderGa);
  assert.equal(attr.gclid, "KLIK");
  assert.equal(attr.ga_client_id, null, "er mag niets verzonnen worden");
});

test("parseGaClientId accepteert alleen een geldige client_id", () => {
  assert.equal(parseGaClientId("GA1.1.1234567890.1700000000"), "1234567890.1700000000");
  assert.equal(parseGaClientId("GA1.2.987.654"), "987.654");
  assert.equal(parseGaClientId("GA1.1.onzin.waarde"), null);
  assert.equal(parseGaClientId("kapot"), null);
  assert.equal(parseGaClientId(""), null);
  assert.equal(parseGaClientId(null), null);
  assert.equal(parseGaClientId(undefined), null);
});

test("een URL zonder attributieparameters levert niets op", () => {
  assert.equal(leesUitUrl("https://montagebaas.com/offerte"), null);
  assert.equal(leesUitUrl("https://montagebaas.com/?fbclid=iets"), null);
  assert.equal(leesUitUrl("geen-geldige-url"), null);
  assert.equal(volgendeCookieWaarde("https://montagebaas.com/"), null);
});

test("een beschadigde cookie gedraagt zich alsof er niets stond", () => {
  const jar = new NepCookieJar();
  jar.schrijf(ATTRIBUTIE_COOKIE, "%7Bgeen-json");
  const attr = attributieVoorInsert(jar);
  assert.equal(attr.gclid, null);
  assert.equal(attr.ga_client_id, null);
});
