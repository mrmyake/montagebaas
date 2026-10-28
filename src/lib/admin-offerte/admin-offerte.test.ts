// Prijs, toeslagen, signalen en mailtekst van /admin/offerte. Draaien: `npm test`.
// Tarieven = de live rij 'Dagenmodel 2026-10' (fixture); ontwerpen = de eigen
// fixtures van Ilja (MB monitor en eiland), plus kleine synthetische artikellijsten.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TARIEVEN_DAGENMODEL } from "../__fixtures__/tarieven-dagenmodel.ts";
import { rondPrijsAf, type KeukenTelling, type Tarieven } from "../rekenen.ts";
import { leesBom } from "../ikea-planner/bom.ts";
import type { Artikel } from "../ikea-planner/bom.ts";
import { bomNaarTelling } from "../ikea-planner/telling.ts";
import { berekenOffertePrijs, effectiefWerkblad, tellingMetWerkblad } from "./prijs.ts";
import { beoordeelVertrouwen, bepaalSignalen, hangrailMeter, type SignaalInvoer } from "./signalen.ts";
import {
  PRIJS_SLOTZIN,
  bepaalOpenVragen,
  controleerMail,
  maakMail,
  mailNaarHtml,
  onderwerpNieuw,
  onderwerpReply,
  type MailInvoer,
} from "./mail.ts";

const fx = (naam: string) =>
  JSON.parse(readFileSync(new URL(`../ikea-planner/__fixtures__/${naam}`, import.meta.url), "utf8"));

function mbMonitor() {
  const o = fx("ontwerp.json");
  const { bom } = leesBom({ appData: { bom: o.bom_ruw } });
  return bomNaarTelling(bom, fx("producten.json"), { opstelling: o.opstelling });
}
function eilandOntwerp() {
  const o = fx("eiland-36FDA15A.json");
  return bomNaarTelling(o.bom, o.producten, { opstelling: o.opstelling });
}

const leeg: KeukenTelling = {
  onderkasten: 0, bovenkasten: 0, hoge_kasten: 0, lade_elementen: 0, zijwanden: 0, plint_meter: 0,
  lichtlijst_meter: 0, werkblad_meter: 0, uitsparing_spoelbak: 0, uitsparing_kookplaat: 0, koppeling: 0,
  spatwand_meter: 0, spoelbak_kraan: 0, vaatwasser: 0, inductie: 0, gaskookplaat: 0, afzuigkap: 0, oven: 0,
  koelkast_vriezer: 0, magnetron: 0, sloop: 0, scheve_muren: 0, kraanboring: 0, afvoer_leidingwerk: 0,
  onderkast_verlichting: 0, binneninrichting: 0, eiland: 0, aannames: [], vertrouwen: "hoog",
};
const art = (soort: string, aantal = 1, omschrijving = soort): Artikel => ({
  dbId: `ART-${soort}`, artikelnummer: "000.000.00", naam: "X", omschrijving, soort, aantal, leverbaar: true,
});

// ---------------------------------------------------------------------------
// Afronding
// ---------------------------------------------------------------------------

test("afronding: altijd omhoog naar 25/75/95, nooit omlaag", () => {
  assert.equal(rondPrijsAf(3103, [25, 75, 95]), 3125);
  assert.equal(rondPrijsAf(3125, [25, 75, 95]), 3125); // precies op de grens blijft staan
  assert.equal(rondPrijsAf(3126, [25, 75, 95]), 3175);
  assert.equal(rondPrijsAf(3176, [25, 75, 95]), 3195);
  assert.equal(rondPrijsAf(3196, [25, 75, 95]), 3225); // over de honderd heen
  assert.equal(rondPrijsAf(3095.01, [25, 75, 95]), 3125);
  for (let c = 150_000; c < 400_000; c += 733) {
    const b = c / 100;
    const r = rondPrijsAf(b, [25, 75, 95]);
    assert.ok(r >= b, `${b} → ${r} is omlaag`);
    assert.ok([25, 75, 95].includes(r % 100), `${r} eindigt niet op 25/75/95`);
  }
});

// ---------------------------------------------------------------------------
// Prijs en toeslagen
// ---------------------------------------------------------------------------

test("MB monitor: laminaat op locatie → zaagtoeslag uit de tarieven, opnieuw afgerond", () => {
  const r = mbMonitor();
  const p = berekenOffertePrijs(r.telling, TARIEVEN_DAGENMODEL, { werkblad: r.werkblad, oudeKeuken: false });
  assert.equal(r.werkblad, "laminaat_op_locatie");
  assert.deepEqual(p.toeslagen.map((t) => [t.sleutel, t.incl]), [["werkblad_zagen_incl", 350]]);
  assert.equal(p.basis.compleet.incl, 2095);
  assert.equal(p.basis.montageklaar.incl, 1425);
  assert.equal(p.compleet, 2475); // 2095 + 350 = 2445 → 2475
  assert.equal(p.montageklaar, 1775); // 1425 + 350 = 1775
  assert.deepEqual(p.dagen, { compleet: 3, montageklaar: 2 });
  assert.equal(p.verschilBinnenMarge, true);
});

test("oude keuken verwijderen: sloop-toeslag erbij, en afronding blijft omhoog", () => {
  const r = mbMonitor();
  const p = berekenOffertePrijs(r.telling, TARIEVEN_DAGENMODEL, { werkblad: "maatwerk_laminaat", oudeKeuken: true });
  assert.deepEqual(p.toeslagen.map((t) => t.sleutel), ["sloop_incl"]);
  assert.equal(p.compleet, rondPrijsAf(2095 + 995, [25, 75, 95])); // 3090 → 3095
  assert.equal(p.compleet, 3095);
  assert.equal(p.montageklaar, 2425); // 1425 + 995 = 2420 → 2425
});

test("toeslagen: beide tegelijk, en zonder toeslag geen extra", () => {
  const r = mbMonitor();
  const beide = berekenOffertePrijs(r.telling, TARIEVEN_DAGENMODEL, { werkblad: "laminaat_op_locatie", oudeKeuken: true });
  assert.equal(beide.compleet, rondPrijsAf(2095 + 350 + 995, [25, 75, 95]));
  const geen = berekenOffertePrijs(r.telling, TARIEVEN_DAGENMODEL, { werkblad: "maatwerk_laminaat", oudeKeuken: false });
  assert.deepEqual(geen.toeslagen, []);
  assert.equal(geen.compleet, 2095);
});

test("toeslag ontbreekt in de tarievenrij → fout, geen verzonnen bedrag", () => {
  const zonder: Tarieven = { ...TARIEVEN_DAGENMODEL, toeslagen: {} };
  assert.throws(
    () => berekenOffertePrijs(mbMonitor().telling, zonder, { werkblad: "laminaat_op_locatie", oudeKeuken: false }),
    /werkblad_zagen_incl ontbreekt/
  );
});

test("pakketverschil: binnen 0,8–1,2 × dagtarief incl. (grenzen inbegrepen), daarbuiten waarschuwing", () => {
  const t = mbMonitor().telling;
  // Montageklaar = Compleet − 2 dagen → verschil ≈ 2 dagen: buiten de marge.
  const tweeDagen: Tarieven = { ...TARIEVEN_DAGENMODEL, basis: { ...TARIEVEN_DAGENMODEL.basis, montageklaar_min_dagen: 2 } };
  const p = berekenOffertePrijs(t, tweeDagen, { werkblad: "maatwerk_laminaat", oudeKeuken: false });
  assert.equal(p.verschilBinnenMarge, false);
  // Regressie uit de offerteketen: €480 bij een dagprijs van €678 moet flaggen.
  assert.ok(480 / 677.6 < 0.8);
  const normaal = berekenOffertePrijs(t, TARIEVEN_DAGENMODEL, { werkblad: "maatwerk_laminaat", oudeKeuken: false });
  assert.equal(normaal.dagprijsIncl, 677.6);
  assert.equal(normaal.verschil, 670);
  assert.equal(normaal.verschilBinnenMarge, true);
});

test("werkblad-override: automatisch volgt het ontwerp, steen haalt blad en uitsparingen uit de telling", () => {
  assert.equal(effectiefWerkblad("laminaat_op_locatie", "automatisch"), "laminaat_op_locatie");
  assert.equal(effectiefWerkblad("laminaat_op_locatie", "laminaat_voorgezaagd"), "maatwerk_laminaat");
  assert.equal(effectiefWerkblad("maatwerk_laminaat", "laminaat_zagen"), "laminaat_op_locatie");
  assert.equal(effectiefWerkblad("geen", "steen"), "steen");
  const t = tellingMetWerkblad(mbMonitor().telling, "steen");
  assert.equal(t.werkblad_meter, 0);
  assert.equal(t.uitsparing_spoelbak, 0);
  assert.ok(t.aannames.some((a) => a.startsWith("Steen/keramiek")));
  // Steen: geen zaagtoeslag.
  const p = berekenOffertePrijs(mbMonitor().telling, TARIEVEN_DAGENMODEL, { werkblad: "steen", oudeKeuken: false });
  assert.deepEqual(p.toeslagen, []);
});

// ---------------------------------------------------------------------------
// Signalen
// ---------------------------------------------------------------------------

const invoer = (o: Partial<SignaalInvoer> & { telling?: Partial<KeukenTelling> }): SignaalInvoer => ({
  artikelen: [],
  werkblad: "maatwerk_laminaat",
  eilandInhoud: [],
  verankeringsframe: false,
  ...o,
  telling: { ...leeg, onderkasten: 4, ...o.telling },
});
const ids = (i: SignaalInvoer) => bepaalSignalen(i).map((s) => s.id);

test("hangrail: meters uit de omschrijving, ratio per bovenkast 0,8–1,2", () => {
  assert.equal(hangrailMeter([art("ophangrail", 3, "ophangrail, verzinkt, 200 cm")]), 6);
  assert.equal(hangrailMeter([art("ophangrail", 2, "ophangrail, verzinkt")]), 4); // zonder maat: 200 cm
  const met = (rails: number, bk: number) =>
    ids(invoer({ artikelen: [art("ophangrail", rails, "ophangrail, verzinkt, 200 cm")], telling: { bovenkasten: bk } }));
  assert.ok(!met(2, 4).includes("hangrail")); // 4 m / 4 = 1,0
  assert.ok(!met(2, 5).includes("hangrail")); // 0,8: grens telt mee
  assert.ok(met(1, 4).includes("hangrail")); // 0,5
  assert.ok(met(3, 4).includes("hangrail")); // 1,5
  assert.ok(!met(3, 0).includes("hangrail")); // geen bovenkasten: geen ratio
});

test("eiland en verankeringsframe: beide richtingen", () => {
  const a = [art("onderkast", 4)];
  assert.ok(ids(invoer({ artikelen: a, telling: { eiland: 1 } })).includes("eiland_zonder_frame"));
  assert.ok(!ids(invoer({ artikelen: a, telling: { eiland: 1 }, verankeringsframe: true })).includes("eiland_zonder_frame"));
  assert.ok(ids(invoer({ artikelen: a, verankeringsframe: true })).includes("frame_zonder_eiland"));
  assert.deepEqual(ids(invoer({ artikelen: a })), []);
});

test("scope: spoelbak in eiland, steen, inductie", () => {
  const s = bepaalSignalen(invoer({ eilandInhoud: ["spoelbak", "vaatwasser"], werkblad: "steen", telling: { inductie: 1, eiland: 1 }, verankeringsframe: true }));
  assert.match(s.find((x) => x.id === "eiland_spoelbak")!.tekst, /water, afvoer en stroom/);
  assert.match(s.find((x) => x.id === "steen")!.tekst, /aansluitingen na plaatsing/);
  assert.match(s.find((x) => x.id === "inductie")!.tekst, /Perilex/);
});

test("opvallende combinaties: twee vriezers zonder koelkast, afzuig-conflicten", () => {
  assert.ok(ids(invoer({ artikelen: [art("diepvrieskast", 2)] })).includes("vriezers_zonder_koelkast"));
  assert.ok(!ids(invoer({ artikelen: [art("diepvrieskast", 2), art("koelkast")] })).includes("vriezers_zonder_koelkast"));
  assert.ok(ids(invoer({ artikelen: [art("koolstoffilter"), art("flexibele afvoerpijp voor afzuigkap")], telling: { afzuigkap: 1 } })).includes("afzuig_conflict"));
  assert.ok(ids(invoer({ artikelen: [art("inductiekookplaat/geïnteg afzuigkap")], telling: { afzuigkap: 1, inductie: 1 } })).includes("dubbele_afzuiging"));
  assert.ok(ids(invoer({ artikelen: [art("koolstoffilter")] })).includes("afzuig_toebehoren_zonder_kap"));
});

test("pootjes tellen nergens mee als controle; vaatwasserpositie is geen onderkast", () => {
  const zonder = ids(invoer({ artikelen: [art("onderkast", 4)] }));
  const metVeelPoten = ids(invoer({ artikelen: [art("onderkast", 4), art("poot voor kast", 97)] }));
  assert.deepEqual(metVeelPoten, zonder);
  const r = mbMonitor();
  assert.equal(r.telling.onderkasten, 3); // 4 posities, waarvan 1 vaatwasser
});

test("eigen fixtures: MB monitor en eiland-ontwerp geven de verwachte signalen", () => {
  const mb = mbMonitor();
  const s = bepaalSignalen({ ...mb, telling: mb.telling });
  assert.deepEqual(s.map((x) => x.id).sort(), ["afzuig_conflict", "hangrail", "inductie"]);
  const ei = eilandOntwerp();
  assert.equal(ei.telling.eiland, 1);
  assert.equal(ei.verankeringsframe, true);
  assert.ok(!bepaalSignalen({ ...ei, telling: ei.telling }).some((x) => x.id === "eiland_zonder_frame"));
});

test("vertrouwen: hoog bij schone lijst, gemiddeld bij niet-herkend, laag zonder kasten", () => {
  assert.equal(beoordeelVertrouwen(mbMonitor().telling, "laminaat_op_locatie").vertrouwen, "hoog");
  assert.equal(beoordeelVertrouwen({ ...leeg, onderkasten: 3, aannames: ["Niet herkend, controleren: x (1)"] }, "maatwerk_laminaat").vertrouwen, "gemiddeld");
  assert.equal(beoordeelVertrouwen(leeg, "geen").vertrouwen, "laag");
  assert.equal(beoordeelVertrouwen({ ...leeg, onderkasten: 3, vertrouwen: "laag" }, "geen").vertrouwen, "laag");
});

// ---------------------------------------------------------------------------
// Mail
// ---------------------------------------------------------------------------

function mailInvoer(o: Partial<MailInvoer> = {}): MailInvoer {
  const r = mbMonitor();
  return {
    naam: "Sanne",
    telling: r.telling,
    werkblad: r.werkblad,
    eilandInhoud: [],
    compleet: 2475,
    montageklaar: 1775,
    oudeKeuken: false,
    amsterdam: false,
    vragen: [],
    ...o,
  };
}

test("mail: beide varianten halen de controle, met opbouw scope → prijzen → uitsluitingen", () => {
  for (const variant of ["uitgebreid", "compact"] as const) {
    const tekst = maakMail(mailInvoer(), variant);
    assert.deepEqual(controleerMail(tekst, { oudeKeuken: false, amsterdam: false }), [], variant);
    assert.ok(tekst.startsWith("Hej Sanne,"));
    assert.ok(tekst.includes("€ 2.475") && tekst.includes("€ 1.775"));
    assert.ok(tekst.includes(PRIJS_SLOTZIN));
    assert.ok(tekst.trim().endsWith("Groet,\nIlja\nDe Keukenheld"));
    const i = (s: string) => tekst.indexOf(s);
    assert.ok(i("onderkasten") < i("Compleet") && i("Compleet") < i(PRIJS_SLOTZIN) && i(PRIJS_SLOTZIN) < i("water en elektra"));
    assert.ok(!/werkdag|\bdagen\b|Montagebaas|—|verpakking|oude keuken/i.test(tekst), variant);
  }
});

test("mail: oude keuken alleen als de toggle aan staat; Amsterdam sluit parkeerkosten uit", () => {
  const met = maakMail(mailInvoer({ oudeKeuken: true, amsterdam: true }), "uitgebreid");
  assert.match(met, /verwijderen van je oude keuken/);
  assert.match(met, /Parkeerkosten in Amsterdam zijn niet bij de prijs inbegrepen\./);
  assert.deepEqual(controleerMail(met, { oudeKeuken: true, amsterdam: true }), []);
  const compact = maakMail(mailInvoer({ amsterdam: true }), "compact");
  assert.match(compact, /Parkeerkosten in Amsterdam/);
});

test("mail: open vragen alleen als ze aangevinkt zijn", () => {
  const ei = eilandOntwerp();
  const vragen = bepaalOpenVragen({ telling: ei.telling, werkblad: ei.werkblad, eilandInhoud: ["spoelbak"], metArtikellijst: true, afzuigOnduidelijk: false });
  const eigen = vragen.find((v) => v.id === "eigen_apparaten")!;
  assert.match(eigen.tekst, /vaatwasser, koelkast en kookplaat/);
  assert.equal(eigen.standaardAan, true);
  assert.equal(vragen.find((v) => v.id === "planning")!.standaardAan, false);
  const zonder = maakMail(mailInvoer({ vragen: [] }), "uitgebreid");
  const met = maakMail(mailInvoer({ vragen: [eigen] }), "uitgebreid");
  assert.ok(!zonder.includes("Regel je die zelf?"));
  assert.ok(met.includes("Regel je die zelf?"));
  for (const v of vragen) assert.deepEqual(controleerMail(`Hej X,\n\n${v.tekst}\n\n€ 1 € 2 ${PRIJS_SLOTZIN}`, { oudeKeuken: false, amsterdam: false }), [], v.id);
});

test("mail: eiland met spoelbak, steen en inductie komen als volzinnen in de uitsluitingen", () => {
  const tekst = maakMail(mailInvoer({ eilandInhoud: ["spoelbak"], werkblad: "steen" }), "uitgebreid");
  assert.match(tekst, /spoelbak in het eiland .* water, afvoer en stroom al in de vloer liggen/);
  assert.match(tekst, /steen, composiet of porselein .* aansluiten van spoelbak en kookplaat na plaatsing/);
  assert.match(tekst, /Perilex-aansluiting/);
  assert.ok(!/op maat zagen/.test(tekst)); // steen: geen zaagwerk in de scope
});

test("controle vangt de bekende fouten", () => {
  const p = (t: string, o = { oudeKeuken: false, amsterdam: false }) => controleerMail(t, o).join(" | ");
  const goed = maakMail(mailInvoer(), "compact");
  assert.match(p(goed.replace("Hej Sanne,", "Beste Sanne,")), /Aanhef/);
  assert.match(p(goed.replace("Ik hoor graag van je.", "Laat me weten wat je ervan vindt.")), /Gebiedende wijs/);
  assert.match(p(goed.replace("Ik hoor graag van je.", "Stuur me even een berichtje.")), /Gebiedende wijs/);
  assert.match(p(goed + "\n— Ilja"), /em-dash/);
  assert.match(p(goed + " Montagebaas"), /Montagebaas/);
  assert.match(p(goed + " Dit kost 3 werkdagen."), /dagen/);
  assert.match(p(goed + " Wilt u reageren?"), /u\/uw/);
  assert.match(p(goed + " Ook de oude keuken kan eruit."), /oude keuken/);
  assert.match(p(goed + " Montage vanaf € 99."), /twee bedragen/);
  assert.match(p(goed, { oudeKeuken: false, amsterdam: true }), /parkeerkosten/);
  assert.match(p(goed.replace(PRIJS_SLOTZIN, "Inclusief btw.")), /Slotzin/);
});

test("onderwerp en HTML", () => {
  assert.equal(onderwerpNieuw("Utrecht"), "Offerte keukenmontage - Utrecht");
  assert.equal(onderwerpNieuw(null), "Offerte keukenmontage");
  assert.equal(onderwerpReply("Keuken offerte"), "Re: Keuken offerte");
  assert.equal(onderwerpReply("RE: Keuken"), "RE: Keuken");
  const html = mailNaarHtml("Hej <Jan>,\n\nRegel 1\nRegel 2");
  assert.ok(html.includes("Hej &lt;Jan&gt;,"));
  assert.ok(html.includes("Regel 1<br>Regel 2"));
});
