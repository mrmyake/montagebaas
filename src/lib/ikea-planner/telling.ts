/**
 * Schakel 1 voor planner-links: BOM (+ productgegevens) → KeukenTelling. PUUR.
 *
 * Telregels volgen de skill `ikea-keuken-offerte` (references/telling.md en
 * prijs.md), met twee bewuste afwijkingen voor BOM-data (zie spike-RAPPORT §4b):
 *  - GEEN ophangrail-ratio als controle: IKEA zet rails ook bij onder- en hoge kasten.
 *  - GEEN pootjes-aantallen als controle.
 *
 * Er wordt geteld op `soort` = het eerste deel van de NL-omschrijving
 * ("onderkast, zwartgrijs" → "onderkast"). Frames tellen, fronten niet. Een
 * vaatwasserpositie heeft geen METOD-frame en telt dus vanzelf niet als onderkast.
 */
import type { KeukenTelling } from "../rekenen.ts";
import { artikelenUitBom, geprijsdeRegels, prijscontrole, type Artikel, type BomNode } from "./bom.ts";
import type { ProductInfo } from "./product.ts";

export type WerkbladSoort =
  | "geen"
  | "steen" // keramiek/porselein/composiet/kwarts: leverancier meet in en plaatst, buiten scope
  | "maatwerk_laminaat" // door IKEA/HACKBOL op maat gezaagd, uitsparingen ook
  | "laminaat_op_locatie" // standaardlengte: zagen op locatie, toeslag halve dag
  | "hout" // massief hout/fineer: toeslag €400–525
  | "overig";

/** prijs.md: laminaat dat op locatie gezaagd moet worden = halve dag, ongeveer €350. */
export const TOESLAG_LAMINAAT_OP_LOCATIE = 350;

export interface PlannerTelling {
  telling: KeukenTelling;
  artikelen: Artikel[];
  werkblad: WerkbladSoort;
  prijscontrole: ReturnType<typeof prijscontrole>;
}

const rond1 = (n: number) => Math.round(n * 10) / 10;
const rond2 = (n: number) => Math.round(n * 100) / 100;

const STEEN = /porselein|keramiek|composiet|kwarts|steen(?!patroon)/i;
const HOUT = /massief|fineer|eiken(?!patroon|effect)|walnoot|bamboe/i;

export function bomNaarTelling(
  bom: BomNode,
  producten: Record<string, ProductInfo>,
  meta: { projectNaam?: string | null; datumOpgeslagen?: string | null } = {}
): PlannerTelling {
  const artikelen = artikelenUitBom(bom, producten);
  const aannames: string[] = [];

  const som = (pred: (a: Artikel) => boolean) => rond2(artikelen.filter(pred).reduce((s, a) => s + a.aantal, 0));
  const soortIs = (...soorten: string[]) => (a: Artikel) => soorten.includes(a.soort);
  const soortMatch = (re: RegExp) => (a: Artikel) => re.test(a.soort);

  // Meters komen uit de BOM-nodes zelf (computedWidth in mm), niet uit de verpakkingsmaat.
  const regels = geprijsdeRegels(bom);
  const omschr = (dbId: string) => (producten[dbId]?.omschrijving ?? "").toLowerCase();
  const breedteM = (n: BomNode) => (typeof n?.computedWidth === "number" ? n.computedWidth / 1000 : 0);
  const meters = (pred: (o: string) => boolean) =>
    rond1(regels.filter((r) => r.dbId.startsWith("ART-") && pred(omschr(r.dbId))).reduce((s, r) => s + breedteM(r.node), 0));

  // ---- Kasten (frames) ----
  const onderkasten = som(soortIs("onderkast", "hoekonderkast", "onderkast v inbouwapp/spoelbak"));
  const opzet = som(soortIs("bovenkast met ventilatie"));
  const bovenkasten = rond2(som(soortIs("bovenkast")) + opzet);
  if (opzet) aannames.push(`${opzet} bovenkast(en) met ventilatie (opzetkast op hoge kast/koelkast) geteld als bovenkast`);
  const hoge_kasten = som(soortIs("hoge kast", "hoge kast voor inbouwapparatuur"));

  // ---- Werkblad ----
  const bladen = artikelen.filter((a) => a.soort === "werkblad" || a.soort === "maatwerkblad");
  let werkblad: WerkbladSoort = "geen";
  if (bladen.some((a) => STEEN.test(a.omschrijving))) werkblad = "steen";
  else if (bladen.some((a) => a.soort === "maatwerkblad")) werkblad = "maatwerk_laminaat";
  else if (bladen.some((a) => HOUT.test(a.omschrijving))) werkblad = "hout";
  else if (bladen.some((a) => /laminaat/i.test(a.omschrijving))) werkblad = "laminaat_op_locatie";
  else if (bladen.length) werkblad = "overig";

  const bladStukken = regels.filter(
    (r) => /werkblad/.test(omschr(r.dbId)) && !/steunbeslag|led-strip/.test(omschr(r.dbId)) &&
      typeof r.node?.computedWidth === "number" && typeof r.node?.computedDepth === "number"
  );
  let werkblad_meter = rond1(bladStukken.reduce((s, r) => s + breedteM(r.node), 0));
  let koppeling = Math.max(0, bladStukken.length - 1);

  // Niet 'ondergelijmde spoelbak': dat is de HACKBOL-/YTTERVÄGGA-dienst voor maatwerk, de spoelbak zelf staat apart.
  const spoelbakken = som(soortMatch(/^(inbouw|opbouw|onderbouw)?spoelbak/));
  const kranen = som(soortMatch(/keukenmengkraan/));
  const kookplaten = som((a) => /kookplaat/.test(a.soort) && !/recirculatie|scheiding/.test(a.soort));
  let uitsparing_spoelbak = spoelbakken;
  let uitsparing_kookplaat = kookplaten;
  let spoelbak_kraan = Math.max(spoelbakken, kranen ? 1 : 0);

  if (werkblad === "steen") {
    aannames.push("Steen/keramiek/porselein/composiet werkblad: blad, uitsparingen, koppeling en (onderbouw)spoelbak buiten scope (leverancier meet in en plaatst)");
    werkblad_meter = 0;
    koppeling = 0;
    uitsparing_spoelbak = 0;
    uitsparing_kookplaat = 0;
    spoelbak_kraan = 0;
  } else if (werkblad === "maatwerk_laminaat") {
    aannames.push("Maatwerkblad laminaat: voorgezaagd door IKEA (HACKBOL), uitsparingen niet op locatie");
    uitsparing_spoelbak = 0;
    uitsparing_kookplaat = 0;
  } else if (werkblad === "laminaat_op_locatie") {
    aannames.push(`Laminaat werkblad op standaardlengte: op locatie zagen, toeslag halve dag (~€${TOESLAG_LAMINAAT_OP_LOCATIE}) zit NIET in de berekende prijs`);
  } else if (werkblad === "hout") {
    aannames.push("Houten werkblad (massief/fineer): toeslag €400–525 afhankelijk van complexiteit zit NIET in de berekende prijs");
  } else if (werkblad === "overig") {
    aannames.push(`Werkbladmateriaal niet herkend (${bladen.map((a) => a.omschrijving).join("; ")}): controleer scope en toeslag`);
  }
  if (koppeling) aannames.push(`Koppeling = aantal bladdelen − 1 (${bladStukken.length} delen)`);

  // ---- Plint en spatwand (meters) ----
  const plint_meter = meters((o) => /^(geventileerde )?plint/.test(o));
  const spatwandExt = regels
    .filter((r) => r.dbId.startsWith("EXT-") && r.methode === "linearMeter" && r.node?.computedHeight && /wandpaneel/.test(omschr(r.dbId)))
    .reduce((s, r) => s + r.aantal, 0);
  const spatwand_meter = rond1(meters((o) => /wandpaneel/.test(o)) + spatwandExt);

  // ---- Apparatuur ----
  const inductie = som(soortMatch(/^inductiekookplaat/));
  if (artikelen.some((a) => /^inductiekookplaat\/geïnteg afzuigkap/.test(a.soort))) {
    aannames.push("Kookplaat met geïntegreerde afzuiging: geteld als inductie, niet als losse afzuigkap");
  }

  const telling: KeukenTelling = {
    onderkasten,
    bovenkasten,
    hoge_kasten,
    lade_elementen: som(soortIs("lade")),
    zijwanden: som(soortIs("bedekkingspaneel")),
    plint_meter,
    lichtlijst_meter: 0,
    werkblad_meter,
    uitsparing_spoelbak,
    uitsparing_kookplaat,
    koppeling,
    spatwand_meter,
    spoelbak_kraan,
    vaatwasser: som(soortMatch(/^inbouw ?vaatwasser|^vaatwasser/)),
    inductie,
    gaskookplaat: som(soortMatch(/^gaskookplaat/)),
    afzuigkap: som(soortMatch(/^[a-z]*afzuigkap/)),
    oven: som(soortMatch(/^(hetelucht|stoom|combi-?|inbouw)?oven/)),
    koelkast_vriezer: som(soortMatch(/^(onderbouw )?(koelkast|diepvrieskast|koel- \/ diepvrieskast|vriezer)/)),
    magnetron: som(soortMatch(/^(inbouw )?magnetron/)),
    sloop: 0,
    scheve_muren: 0,
    kraanboring: 0,
    afvoer_leidingwerk: 0,
    onderkast_verlichting: som(soortMatch(/^led-strip/)),
    aannames,
    vertrouwen: "hoog",
  };

  // ---- Signalen voor Ilja ----
  if (artikelen.some((a) => /kast/.test(a.soort) && /(^|, )90x/.test(a.omschrijving))) {
    aannames.push("Kastbreedte 90 cm gevonden: METOD kent die maat niet, mogelijk niet-IKEA-onderdeel. Controleren.");
  }
  for (const a of artikelen.filter((x) => x.leverbaar === false)) {
    aannames.push(`Niet meer leverbaar: ${a.artikelnummer} ${a.naam} ${a.omschrijving} (${a.aantal}×)`);
  }
  const pc = prijscontrole(bom);
  if (pc.verschil !== null && pc.verschil !== 0) {
    aannames.push(`Prijscontrole BOM wijkt af: som €${pc.som} vs. totaal €${pc.totaal} (verschil €${pc.verschil})`);
  }
  aannames.push("Lichtlijst, sloop, scheve muren, kraanboring en afvoer/leidingwerk: niet af te leiden uit de planner, op 0");
  aannames.push(
    `Bron: IKEA planner-link${meta.projectNaam ? ` "${meta.projectNaam}"` : ""}` +
      (meta.datumOpgeslagen ? `, laatst opgeslagen ${meta.datumOpgeslagen.slice(0, 10)}` : "")
  );

  return { telling, artikelen, werkblad, prijscontrole: pc };
}
