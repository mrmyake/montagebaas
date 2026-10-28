// Tests voor de pure kant van de Google Ads-upload. Draaien: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADS_LEAD_WAARDE_STANDAARD,
  beslis,
  bouwIngestRequest,
  isGeldigKlikId,
  kiesKlikId,
  ongeldigeKlikIds,
  normaliseerEmail,
  normaliseerTelefoon,
  parseUitgeslotenContacten,
  sha256Hex,
  type TeVersturenRij,
  ADS_UITSLUITEN_STANDAARD,
  parseUitsluitregels,
  valtOnderUitsluiting,
} from "./ads-conversies.ts";

const basis: TeVersturenRij = {
  aanvraag_id: "11111111-2222-3333-4444-555555555555",
  conversie_actie: "opdracht_gewonnen",
  event_tijdstip: "2026-10-01T10:00:00+00:00",
  tijdstip_bron: "log",
  waarde: "2700.00",
  created_at: "2026-09-20T08:00:00+00:00",
  lead_status: "gewonnen",
  gclid: "Cj0KCQ-test-0123456789abcdef",
  gbraid: null,
  wbraid: null,
  email: " Jan.Jansen+keuken@Gmail.com ",
  telefoon: "06-12 34 56 78",
  consent_ad_user_data: true,
  consent_ad_personalization: true,
  upload_status: null,
  consent_bron: "banner",
  duplicaat_van: null,
};

test("e-mail: whitespace, lowercase, gmail-punten en +label", () => {
  assert.equal(normaliseerEmail(" Jan.Jansen+keuken@Gmail.com "), "janjansen@gmail.com");
  assert.equal(normaliseerEmail("Piet.de.Vries@googlemail.com"), "pietdevries@googlemail.com");
  assert.equal(normaliseerEmail("User.Name+NYC@Example.com"), "user.name+nyc@example.com");
  assert.equal(normaliseerEmail("kapot@"), null);
  assert.equal(normaliseerEmail(""), null);
  assert.equal(normaliseerEmail(null), null);
});

test("telefoon: NL-varianten naar E.164, ongeldig wordt null", () => {
  assert.equal(normaliseerTelefoon("06-12 34 56 78"), "+31612345678");
  assert.equal(normaliseerTelefoon("0031 6 12345678"), "+31612345678");
  assert.equal(normaliseerTelefoon("+31 (0)6 12345678"), "+31612345678");
  assert.equal(normaliseerTelefoon("+31612345678"), "+31612345678");
  assert.equal(normaliseerTelefoon("31612345678"), "+31612345678");
  assert.equal(normaliseerTelefoon("020 123 4567"), "+31201234567");
  assert.equal(normaliseerTelefoon("+32 470 12 34 56"), "+32470123456");
  assert.equal(normaliseerTelefoon("12345"), null);
  assert.equal(normaliseerTelefoon("abc"), null);
  assert.equal(normaliseerTelefoon(null), null);
});

test("sha256 hex komt overeen met bekende waarde", () => {
  // Referentiewaarde uit de Google-docs voor "test@gmail.com" is niet gepubliceerd;
  // we toetsen tegen de standaard SHA-256 van een lege string.
  assert.equal(
    sha256Hex(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
});

const G = "Cj0KCQjw-gclid_0123456789ABCDEF"; // 31 tekens, geldig
const B = "ABCDEFGHIJKLMNOPQRST"; // precies 20 tekens, geldig
const W = "w-" + "x".repeat(30);

test("klik-id: voorrang gclid > gbraid > wbraid", () => {
  assert.deepEqual(kiesKlikId({ gclid: G, gbraid: B, wbraid: W }), { type: "gclid", waarde: G });
  assert.deepEqual(kiesKlikId({ gclid: null, gbraid: B, wbraid: W }), { type: "gbraid", waarde: B });
  assert.deepEqual(kiesKlikId({ gclid: null, gbraid: null, wbraid: W }), { type: "wbraid", waarde: W });
  assert.equal(kiesKlikId({ gclid: null, gbraid: null, wbraid: null }), null);
});

test("klik-id formaat: alleen [A-Za-z0-9_-] en minimaal 20 tekens", () => {
  assert.equal(isGeldigKlikId(B), true);
  assert.equal(isGeldigKlikId("ABCDEFGHIJKLMNOPQRS"), false); // 19
  assert.equal(isGeldigKlikId("ABCDEFGHIJKLMNOPQRS T"), false); // spatie
  assert.equal(isGeldigKlikId("ABCDEFGHIJKLMNOPQRS."), false); // punt
  assert.equal(isGeldigKlikId("{gclid}{gclid}{gclid}{gclid}"), false); // onvervangen placeholder
  assert.equal(isGeldigKlikId(null), false);
  assert.equal(isGeldigKlikId(""), false);
});

test("klik-id: ongeldige waarde wordt overgeslagen, volgende geldige wint", () => {
  assert.deepEqual(kiesKlikId({ gclid: "kort", gbraid: B, wbraid: null }), { type: "gbraid", waarde: B });
  assert.equal(kiesKlikId({ gclid: null, gbraid: "abc.1234", wbraid: null }), null);
  assert.deepEqual(ongeldigeKlikIds({ gclid: "kort", gbraid: "abc.1234", wbraid: W }), ["gclid", "gbraid"]);
  assert.deepEqual(ongeldigeKlikIds({ gclid: G, gbraid: null, wbraid: null }), []);
});

test("beslis: ongeldige gbraid → versturen zonder click-ID, met waarschuwing, niet blokkeren", () => {
  const b = beslis({ ...basis, gclid: null, gbraid: "abc.1234" }, { consentOnbekend: "wachten" });
  assert.equal(b.soort, "versturen");
  if (b.soort !== "versturen") return;
  assert.equal(b.event.adIdentifiers, undefined);
  assert.equal(b.klikType, null);
  assert.equal(b.event.userData?.userIdentifiers.length, 2);
  assert.equal(b.waarschuwingen?.length, 1);
  assert.match(b.waarschuwingen![0], /gbraid.*ongeldig.*8 tekens/);
});

test("beslis: ongeldig click-ID en geen contact → overslaan, waarschuwing blijft staan", () => {
  const b = beslis(
    { ...basis, gclid: "kort", email: "kapot", telefoon: "x" },
    { consentOnbekend: "wachten" }
  );
  assert.equal(b.soort, "overslaan");
  assert.equal(b.waarschuwingen?.length, 1);
});

test("beslis: geldig click-ID → geen waarschuwingen-veld", () => {
  const b = beslis(basis, { consentOnbekend: "wachten" });
  assert.equal(b.waarschuwingen, undefined);
});

test("beslis: volledig event met gclid, gehashte e-mail en telefoon", () => {
  const b = beslis(basis, { consentOnbekend: "wachten" });
  assert.equal(b.soort, "versturen");
  if (b.soort !== "versturen") return;
  assert.equal(b.event.transactionId, `${basis.aanvraag_id}:opdracht_gewonnen`);
  assert.equal(b.event.eventTimestamp, "2026-10-01T10:00:00.000Z");
  assert.equal(b.event.conversionValue, 2700);
  assert.equal(b.event.currency, "EUR");
  assert.deepEqual(b.event.adIdentifiers, { gclid: "Cj0KCQ-test-0123456789abcdef" });
  assert.deepEqual(b.event.userData, {
    userIdentifiers: [
      { emailAddress: sha256Hex("janjansen@gmail.com") },
      { phoneNumber: sha256Hex("+31612345678") },
    ],
  });
  assert.deepEqual(b.event.consent, { adUserData: "CONSENT_GRANTED", adPersonalization: "CONSENT_GRANTED" });
});

test("beslis: offerte/opdracht met waarde 0 of null → overslaan", () => {
  assert.equal(beslis({ ...basis, waarde: 0 }, { consentOnbekend: "wachten" }).soort, "overslaan");
  assert.equal(beslis({ ...basis, waarde: null }, { consentOnbekend: "wachten" }).soort, "overslaan");
});

test("beslis: aanvraag_ontvangen krijgt altijd de vaste leadwaarde, ook zonder prijs", () => {
  const rij = { ...basis, conversie_actie: "aanvraag_ontvangen" as const, lead_status: "nieuw", duplicaat_van: null };
  for (const waarde of [null, 0, "1850", 3125]) {
    const b = beslis({ ...rij, waarde }, { consentOnbekend: "wachten" });
    assert.equal(b.soort, "versturen", `waarde ${waarde}`);
    if (b.soort === "versturen") assert.equal(b.event.conversionValue, ADS_LEAD_WAARDE_STANDAARD);
  }
  const b = beslis({ ...rij, waarde: null }, { consentOnbekend: "wachten", leadWaarde: 1999.5 });
  assert.equal(b.soort === "versturen" && b.event.conversionValue, 1999.5);
});

test("beslis: geen klik-id maar wél e-mail → versturen zonder adIdentifiers", () => {
  const b = beslis({ ...basis, gclid: null, telefoon: "x" }, { consentOnbekend: "wachten" });
  assert.equal(b.soort, "versturen");
  if (b.soort !== "versturen") return;
  assert.equal(b.event.adIdentifiers, undefined);
  assert.equal(b.event.userData?.userIdentifiers.length, 1);
});

test("beslis: geen klik-id en geen bruikbare contactgegevens → overslaan", () => {
  const b = beslis({ ...basis, gclid: null, email: "kapot", telefoon: "x" }, { consentOnbekend: "wachten" });
  assert.equal(b.soort, "overslaan");
});

test("beslis: klik ouder dan 90 dagen → overslaan, zonder klik-id niet", () => {
  const oud = { ...basis, created_at: "2026-06-01T00:00:00+00:00" };
  assert.equal(beslis(oud, { consentOnbekend: "wachten" }).soort, "overslaan");
  assert.equal(beslis({ ...oud, gclid: null }, { consentOnbekend: "wachten" }).soort, "versturen");
});

test("beslis: consent onbekend (nieuwe rij) volgt het beleid", () => {
  const rij = {
    ...basis,
    created_at: "2026-10-23T09:00:00+02:00",
    event_tijdstip: "2026-10-24T09:00:00+02:00",
    consent_ad_user_data: null,
    consent_ad_personalization: null,
  };
  assert.equal(beslis(rij, { consentOnbekend: "wachten" }).soort, "wachten");
  assert.equal(beslis(rij, { consentOnbekend: "overslaan" }).soort, "overslaan");
  const b = beslis(rij, { consentOnbekend: "unspecified" });
  assert.equal(b.soort, "versturen");
  if (b.soort === "versturen") {
    assert.equal(b.event.consent.adUserData, "CONSENT_STATUS_UNSPECIFIED");
  }
});

test("beslis: historische rij (vóór consent-capture) met consent null → UNSPECIFIED, ongeacht beleid", () => {
  // basis.created_at = 2026-09-20, ruim vóór CONSENT_CAPTURE_LIVEGANG (23-10-2026).
  const rij = { ...basis, consent_ad_user_data: null, consent_ad_personalization: null };
  for (const beleid of ["wachten", "overslaan", "unspecified"] as const) {
    const b = beslis(rij, { consentOnbekend: beleid });
    assert.equal(b.soort, "versturen", `beleid ${beleid}`);
    if (b.soort === "versturen") {
      assert.equal(b.event.consent.adUserData, "CONSENT_STATUS_UNSPECIFIED");
      assert.equal(b.event.consent.adPersonalization, "CONSENT_STATUS_UNSPECIFIED");
    }
  }
  // Nieuwe rij (ná livegang) met null blijft het beleid volgen.
  const nieuw = { ...rij, created_at: "2026-10-23T09:00:00+02:00", event_tijdstip: "2026-10-23T09:00:00+02:00" };
  assert.equal(beslis(nieuw, { consentOnbekend: "overslaan" }).soort, "overslaan");
  assert.equal(beslis(nieuw, { consentOnbekend: "wachten" }).soort, "wachten");
  // Grens is instelbaar (test-haak): livegang vóór de rij → rij is 'nieuw'.
  assert.equal(
    beslis(rij, { consentOnbekend: "overslaan", consentLivegang: "2026-09-01T00:00:00+02:00" }).soort,
    "overslaan"
  );
  // Geweigerd blijft geweigerd, ook historisch.
  assert.equal(beslis({ ...rij, consent_ad_user_data: false }, { consentOnbekend: "overslaan" }).soort, "overslaan");
});

test("beslis: tijdstip uit statusimport 25-09 → wachten, vóór elke definitieve beslissing", () => {
  const rij: TeVersturenRij = { ...basis, tijdstip_bron: "migratie", event_tijdstip: "2026-09-25T06:43:00+00:00" };
  const b = beslis(rij, { consentOnbekend: "overslaan" });
  assert.equal(b.soort, "wachten");
  if (b.soort === "wachten") assert.match(b.reden, /25-09/);
  // Ook zonder waarde of met een te oude klik: niet definitief overslaan.
  assert.equal(beslis({ ...rij, waarde: null }, { consentOnbekend: "overslaan" }).soort, "wachten");
  assert.equal(
    beslis({ ...rij, created_at: "2026-05-01T00:00:00+00:00" }, { consentOnbekend: "overslaan" }).soort,
    "wachten"
  );
});

test("beslis: duplicaat (zelfde contact binnen 7 dagen) → overslaan met verwijzing naar de eerste", () => {
  const rij: TeVersturenRij = {
    ...basis,
    conversie_actie: "aanvraag_ontvangen",
    event_tijdstip: basis.created_at,
    waarde: 2700,
    duplicaat_van: "09a5acbd-0000-0000-0000-000000000000",
  };
  const b = beslis(rij, { consentOnbekend: "overslaan" });
  assert.equal(b.soort, "overslaan");
  if (b.soort === "overslaan") assert.equal(b.reden, "duplicaat van 09a5acbd");
  // Zonder duplicaat_van gewoon versturen.
  assert.equal(beslis({ ...rij, duplicaat_van: null }, { consentOnbekend: "overslaan" }).soort, "versturen");
});

test("beslis: eigen contactgegevens (testinzending) → overslaan, op e-mail of telefoon, genormaliseerd", () => {
  const uitgesloten = parseUitgeslotenContacten(" Me@Ilja.com , 06 - 2917 3468, kapot,, ");
  assert.deepEqual([...uitgesloten.emails], ["me@ilja.com"]);
  assert.deepEqual([...uitgesloten.telefoons], ["+31629173468"]);

  const opEmail = beslis({ ...basis, email: "ME@ilja.com" }, { consentOnbekend: "wachten", uitgesloten });
  assert.equal(opEmail.soort, "overslaan");
  if (opEmail.soort === "overslaan") assert.equal(opEmail.reden, "testinzending (eigen contactgegevens)");
  assert.equal(
    beslis({ ...basis, telefoon: "+31 (0)6 29173468" }, { consentOnbekend: "wachten", uitgesloten }).soort,
    "overslaan"
  );
  // Gaat vóór alles: ook een migratie-rij van een testinzending wordt definitief overgeslagen.
  assert.equal(
    beslis({ ...basis, email: "me@ilja.com", tijdstip_bron: "migratie" }, { consentOnbekend: "wachten", uitgesloten }).soort,
    "overslaan"
  );
  // Andere contactgegevens: ongemoeid.
  assert.equal(beslis(basis, { consentOnbekend: "wachten", uitgesloten }).soort, "versturen");
  assert.equal(beslis(basis, { consentOnbekend: "wachten", uitgesloten: parseUitgeslotenContacten("") }).soort, "versturen");
});

test("beslis: geweigerde consent → overslaan, ook bij maar één van de twee", () => {
  const b = beslis({ ...basis, consent_ad_user_data: false, consent_ad_personalization: false }, { consentOnbekend: "wachten" });
  assert.equal(b.soort, "overslaan");
  if (b.soort === "overslaan") assert.equal(b.reden, "consent geweigerd");
  assert.equal(beslis({ ...basis, consent_ad_personalization: false }, { consentOnbekend: "wachten" }).soort, "overslaan");
});

test("request-body: bestemming, HEX-encoding en validateOnly", () => {
  const b = beslis(basis, { consentOnbekend: "wachten" });
  if (b.soort !== "versturen") throw new Error("verwacht versturen");
  const req = bouwIngestRequest(
    { customerId: "3395836845", conversionActionId: "123456", loginCustomerId: null },
    [b.event],
    true
  );
  assert.deepEqual(req.destinations, [
    { operatingAccount: { accountType: "GOOGLE_ADS", accountId: "3395836845" }, productDestinationId: "123456" },
  ]);
  assert.equal(req.encoding, "HEX");
  assert.equal(req.validateOnly, true);
  assert.equal(req.events.length, 1);
  const metMcc = bouwIngestRequest(
    { customerId: "3395836845", conversionActionId: "1", loginCustomerId: "1112223333" },
    [],
    false
  );
  assert.deepEqual(metMcc.destinations[0].loginAccount, { accountType: "GOOGLE_ADS", accountId: "1112223333" });
  assert.equal("validateOnly" in metMcc, false);
});

test("aanvraag_ontvangen: zelfde regels, transactionId met eigen suffix", () => {
  const rij: TeVersturenRij = {
    ...basis,
    conversie_actie: "aanvraag_ontvangen",
    event_tijdstip: basis.created_at,
    waarde: null, // de view levert geen waarde meer voor aanvraag_ontvangen (0014)
  };
  const b = beslis(rij, { consentOnbekend: "overslaan" });
  assert.equal(b.soort, "versturen");
  if (b.soort !== "versturen") return;
  assert.equal(b.event.transactionId, `${basis.aanvraag_id}:aanvraag_ontvangen`);
  assert.equal(b.event.eventTimestamp, "2026-09-20T08:00:00.000Z");
  assert.equal(b.event.conversionValue, ADS_LEAD_WAARDE_STANDAARD);
  // Geen klik-ID en geen contact → overslaan; consent onbekend → beleid.
  assert.equal(
    beslis({ ...rij, gclid: null, email: null, telefoon: null }, { consentOnbekend: "overslaan" }).soort,
    "overslaan"
  );
  // Consent onbekend: historisch (vóór 23-10-2026) → mee met UNSPECIFIED; nieuw → beleid.
  const onbekend = { ...rij, consent_ad_user_data: null, consent_ad_personalization: null };
  assert.equal(beslis(onbekend, { consentOnbekend: "overslaan" }).soort, "versturen");
  const nieuw = { ...onbekend, created_at: "2026-10-23T08:00:00+02:00", event_tijdstip: "2026-10-23T08:00:00+02:00" };
  assert.equal(beslis(nieuw, { consentOnbekend: "overslaan" }).soort, "overslaan");
});

test("ADS_UITSLUITEN: domeinen en adressen, ook met +tag en hoofdletters", () => {
  const r = parseUitsluitregels(ADS_UITSLUITEN_STANDAARD);
  assert.equal(valtOnderUitsluiting("me+test@ilja.com", r), true);
  assert.equal(valtOnderUitsluiting("Ilja@Montagebaas.com", r), true);
  assert.equal(valtOnderUitsluiting("ilja@gamundo.com", r), true);
  assert.equal(valtOnderUitsluiting("Ilja.Goossens+offerte@gmail.com", r), true); // gmail: punten en +tag genormaliseerd
  assert.equal(valtOnderUitsluiting("klant@gmail.com", r), false);
  assert.equal(valtOnderUitsluiting("iemand@ilja.com.nl", r), false); // ander domein
  assert.equal(valtOnderUitsluiting(null, r), false);
  assert.deepEqual(parseUitsluitregels(" , @ , "), { domeinen: new Set(), adressen: new Set() });
});

test("beslis: adres op een uitgesloten domein → overslaan, vóór alle andere regels", () => {
  const b = beslis({ ...basis, email: "me+test@ilja.com" }, { consentOnbekend: "versturen", uitsluiten: parseUitsluitregels(ADS_UITSLUITEN_STANDAARD) });
  assert.equal(b.soort, "overslaan");
  if (b.soort === "overslaan") assert.match(b.reden, /ADS_UITSLUITEN/);
  assert.equal(beslis(basis, { consentOnbekend: "versturen", uitsluiten: parseUitsluitregels(ADS_UITSLUITEN_STANDAARD) }).soort, "versturen");
});

test("beslis: klik-ID met TEST_ (attributietest) → overslaan, ook met een klantadres", () => {
  for (const veld of ["gclid", "gbraid", "wbraid"] as const) {
    const b = beslis({ ...basis, gclid: null, [veld]: "TEST_CC_1761400000_redirect" }, { consentOnbekend: "versturen" });
    assert.equal(b.soort, "overslaan");
    if (b.soort === "overslaan") assert.match(b.reden, /TEST_/);
  }
  assert.equal(beslis({ ...basis, gclid: "test_cc_klein" }, { consentOnbekend: "versturen" }).soort, "overslaan");
});

test("opdracht_gewonnen: pas na de wachttijd op gewonnen, en alleen als de status nog gewonnen/uitgevoerd is", () => {
  const nu = new Date("2026-10-25T08:00:00Z");
  const gewonnen = { ...basis, conversie_actie: "opdracht_gewonnen" as const, lead_status: "gewonnen" };
  const opties = { consentOnbekend: "versturen" as const, nu };
  const kort = beslis({ ...gewonnen, event_tijdstip: "2026-10-25T06:00:00Z" }, opties);
  assert.equal(kort.soort, "wachten");
  if (kort.soort === "wachten") assert.match(kort.reden, /nog geen 24 uur op gewonnen \(2 uur\)/);
  assert.equal(beslis({ ...gewonnen, event_tijdstip: "2026-10-24T07:59:00Z" }, opties).soort, "versturen");
  assert.equal(beslis({ ...gewonnen, lead_status: "uitgevoerd", event_tijdstip: "2026-10-20T08:00:00Z" }, opties).soort, "versturen");
  const terug = beslis({ ...gewonnen, lead_status: "verloren", event_tijdstip: "2026-10-20T08:00:00Z" }, opties);
  assert.equal(terug.soort, "wachten");
  if (terug.soort === "wachten") assert.match(terug.reden, /niet \(meer\) gewonnen/);
  // Wachttijd instelbaar; 0 = meteen.
  assert.equal(beslis({ ...gewonnen, event_tijdstip: "2026-10-25T07:59:00Z" }, { ...opties, gewonnenWachttijdUur: 0 }).soort, "versturen");
  // Andere acties wachten niet.
  assert.equal(beslis({ ...basis, conversie_actie: "aanvraag_ontvangen", event_tijdstip: "2026-10-25T07:59:00Z" }, opties).soort, "versturen");
});

test("uitsluiting: de testlead-adressen van de redesign (Fase 4) vallen eronder, klantadressen niet", () => {
  const r = parseUitsluitregels(ADS_UITSLUITEN_STANDAARD);
  for (const e of ["me@ilja.com", "me+test@ilja.com", "ME+Test@Ilja.com ", "info@montagebaas.com", "test+fase4@montagebaas.com"]) {
    assert.equal(valtOnderUitsluiting(e, r), true, e);
  }
  for (const e of ["jan@voorbeeld.nl", "ilja@gmail.com", "me@ilja.com.voorbeeld.nl", null]) {
    assert.equal(valtOnderUitsluiting(e, r), false, String(e));
  }
});

test("admin_link (/admin/offerte): nooit aanvraag_ontvangen, opdracht_gewonnen wel na de wachttijd", () => {
  const admin = { ...basis, invoermethode: "admin_link", email: "klant@example.nl" };
  const opties = { consentOnbekend: "unspecified" as const, nu: new Date("2026-10-03T10:00:00Z") };
  const ontvangen = beslis({ ...admin, conversie_actie: "aanvraag_ontvangen", waarde: null }, opties);
  assert.equal(ontvangen.soort, "overslaan");
  assert.match((ontvangen as { reden: string }).reden, /admin\/offerte/);
  assert.equal(beslis(admin, opties).soort, "versturen"); // opdracht_gewonnen, 48 uur na gewonnen
  assert.equal(beslis({ ...admin, event_tijdstip: "2026-10-03T00:00:00Z" }, opties).soort, "wachten"); // pas 10 uur
  // Een website-aanvraag krijgt aanvraag_ontvangen gewoon.
  assert.equal(beslis({ ...basis, invoermethode: "link", conversie_actie: "aanvraag_ontvangen", waarde: null }, opties).soort, "versturen");
});
