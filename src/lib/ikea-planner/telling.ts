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
import { STEENBLAD_AANNAME, type KeukenTelling } from "../rekenen.ts";
import { artikelenUitBom, geprijsdeRegels, posities, prijscontrole, type Artikel, type BomNode } from "./bom.ts";
import type { ProductInfo } from "./product.ts";
import { eilandPosities, type Opstelling } from "./opstelling.ts";

export type WerkbladSoort =
  | "geen"
  | "steen" // keramiek/porselein/composiet/kwarts: leverancier meet in en plaatst, buiten scope
  | "maatwerk_laminaat" // door IKEA/HACKBOL op maat gezaagd, uitsparingen ook
  | "laminaat_op_locatie" // standaardlengte: zagen op locatie, toeslag halve dag
  | "hout" // massief hout/fineer: toeslag €400–525
  | "overig";


export interface PlannerTelling {
  telling: KeukenTelling;
  artikelen: Artikel[];
  werkblad: WerkbladSoort;
  prijscontrole: ReturnType<typeof prijscontrole>;
  // Voor de signalen in /admin/offerte: wat er in het eiland staat (spoelbak,
  // vaatwasser, kookplaat) en of er een verankeringsframe besteld is.
  eilandInhoud: string[];
  verankeringsframe: boolean;
}

const rond1 = (n: number) => Math.round(n * 10) / 10;
const rond2 = (n: number) => Math.round(n * 100) / 100;

/** Binneninrichting: telt als aantal in `binneninrichting`. */
const BINNENINRICHTING = [
  "uittrekbare kastinrichting",
  "carrousel onderhoekkast",
  "inrichting onderhoekkast",
  "uittrekbaar frame v afvalsortering",
  "steunframe voor afvalsorteerbak",
];

/**
 * Soorten die bewust niet geteld worden: fronten (frames tellen), beslag,
 * toebehoren van apparaten/spoelbak/led, en de maatwerkdiensten bij een werkblad
 * (het werkbladtype dekt die). Alles wat níet geteld wordt én niet hier staat,
 * maar wel op montagewerk lijkt (VANGNET), komt als "Niet herkend" in de aannames.
 */
const BEKEND_GENEGEERD = new Set([
  // fronten
  "ladefront", "deur", "deur onderhoekkast", "front voor vaatwasser",
  // beslag en montagedelen
  "ophangrail", "poot voor kast", "scharnier", "scharnier m demper v keuken", "scharnier voor keukenhoekkast",
  "handgreep", "drukbeslag", "verbindingsrail voor fronten", "verbindingsrail v kast/dekpaneel",
  "steunbeslag voor werkblad", "boormal", "inzet ladezijkant", "console voor oven",
  // planken
  "plank", "vaste geventileerde plank", "plank onderhoekkast",
  // toebehoren
  "sifon/bodemventiel 1 bak", "sifon/bodemventiel 2 bakken", "extra aansluiting sifon", "deksel",
  "ton met deksel", "koolstoffilter", "flexibele afvoerpijp voor afzuigkap", "scheiding voor kookplaat",
  "recirculatiekit voor kookplaat", "condensbescherming", "bestekbak", "bak voor keukengerei",
  // led-toebehoren
  "driver voor draadloze besturing", "afstandsbediening", "aansluitsnoer", "verbindingssnoer",
  // werkbladdiensten bij maatwerk
  "gat maken", "voorbereiding", "rand", "kantlijst", "kantlijst achter", "ondergelijmde spoelbak", "gepolijste onderkant",
  // eigen aanname (zie onder)
  "verankeringsframe voor kookeiland",
]);
const VANGNET = /kast|oven|koel|vries|vaatwas|magnetron|afzuig|kook|apparaat|paneel|blad|opberger|verlicht|lamp|led|spoelbak|kraan|plint|lijst|wand|front|deur|lade|plank|rek/;

/**
 * Posities (ASL) en het apparaat dat erin hoort. Sommige namen zijn Engels
 * ("high cabinet for fridge and freezer"). Oven niet midden in een woord:
 * "bovenkast met planken".
 */
const APPARAAT_POSITIES = [
  { apparaat: "vaatwasser", positie: /vaatwasser|dishwasher/ },
  { apparaat: "oven", positie: /(^|[^a-z])oven/ },
  { apparaat: "koelkast/vriezer", positie: /koel|vries|fridge|freezer/ },
  { apparaat: "kookplaat", positie: /kookplaat|\bhob\b/ },
] as const;
type Apparaat = (typeof APPARAAT_POSITIES)[number]["apparaat"];
const eigenApparaat = (apparaat: Apparaat) =>
  `Geen ${apparaat} in de lijst: eigen apparaat of nog niet besteld? Merk en type nodig voor nismaten.`;

/** ["a", "b", "c"] → "a, b en c" */
const opsomming = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} en ${xs.at(-1)}`);

const STEEN = /porselein|keramiek|composiet|kwarts|steen(?!patroon)/i;
const HOUT = /massief|fineer|eiken(?!patroon|effect)|walnoot|bamboe/i;

export function bomNaarTelling(
  bom: BomNode,
  producten: Record<string, ProductInfo>,
  meta: { projectNaam?: string | null; datumOpgeslagen?: string | null; opstelling?: Opstelling | null } = {}
): PlannerTelling {
  const artikelen = artikelenUitBom(bom, producten);
  const aannames: string[] = [];

  // Elk artikel dat ergens meetelt, onthouden: de rest gaat langs het vangnet.
  const geteld = new Set<string>();
  const markeer = (pred: (a: Artikel) => boolean) => artikelen.filter(pred).forEach((a) => geteld.add(a.dbId));
  const tel = (pred: (a: Artikel) => boolean) => rond2(artikelen.filter(pred).reduce((s, a) => s + a.aantal, 0));
  const som = (pred: (a: Artikel) => boolean) => (markeer(pred), tel(pred));
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
  markeer((a) => bladen.includes(a));
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
  const isSpoelbak = (soort: string) => /^(inbouw|opbouw|onderbouw)?spoelbak/.test(soort);
  const isKookplaat = (soort: string) => /kookplaat/.test(soort) && !/recirculatie|scheiding/.test(soort);
  const isVaatwasser = (soort: string) => /^inbouw ?vaatwasser|^vaatwasser/.test(soort);
  const spoelbakken = som((a) => isSpoelbak(a.soort));
  const kranen = som(soortMatch(/keukenmengkraan/));
  const kookplaten = som((a) => isKookplaat(a.soort));
  let uitsparing_spoelbak = spoelbakken;
  let uitsparing_kookplaat = kookplaten;
  let spoelbak_kraan = Math.max(spoelbakken, kranen ? 1 : 0);

  if (werkblad === "steen") {
    // Zelfde velden als steenbladBuitenScope (rekenen.ts); hier inline, zodat de
    // koppeling-aanname hieronder niet ten onrechte verschijnt.
    aannames.push(STEENBLAD_AANNAME);
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
    // Het bedrag staat in de tarieven (toeslagen.werkblad_zagen_incl); de notificatie telt het erbij.
    aannames.push("Laminaat werkblad op standaardlengte: op locatie zagen, toeslag zit NIET in de berekende prijs");
  } else if (werkblad === "hout") {
    aannames.push("Houten werkblad (massief/fineer): toeslag €400–525 afhankelijk van complexiteit zit NIET in de berekende prijs");
  } else if (werkblad === "overig") {
    aannames.push(`Werkbladmateriaal niet herkend (${bladen.map((a) => a.omschrijving).join("; ")}): controleer scope en toeslag`);
  }
  if (koppeling) aannames.push(`Koppeling = aantal bladdelen − 1 (${bladStukken.length} delen)`);

  // ---- Plint en spatwand (meters) ----
  const plint_meter = meters((o) => /^(geventileerde )?plint/.test(o));
  markeer((a) => /^(geventileerde )?plint/.test(a.soort) || /wandpaneel/.test(a.omschrijving));
  const spatwandExt = regels
    .filter((r) => r.dbId.startsWith("EXT-") && r.methode === "linearMeter" && r.node?.computedHeight && /wandpaneel/.test(omschr(r.dbId)))
    .reduce((s, r) => s + r.aantal, 0);
  const spatwand_meter = rond1(meters((o) => /wandpaneel/.test(o)) + spatwandExt);

  // ---- Apparatuur ----
  const inductie = som(soortMatch(/^inductiekookplaat/));
  if (artikelen.some((a) => /^inductiekookplaat\/geïnteg afzuigkap/.test(a.soort))) {
    aannames.push("Kookplaat met geïntegreerde afzuiging: geteld als inductie, niet als losse afzuigkap");
  }

  // ---- Eiland (uit de opstelling, niet uit de BOM) ----
  const pos = posities(bom, producten);
  const eilandUuids = meta.opstelling ? eilandPosities(meta.opstelling) : new Set<string>();
  const eiland = eilandUuids.size > 0 ? 1 : 0;

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
    vaatwasser: som((a) => isVaatwasser(a.soort)),
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
    binneninrichting: som(soortIs(...BINNENINRICHTING)),
    eiland,
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
  const frame = artikelen.some(soortIs("verankeringsframe voor kookeiland"));
  let eilandInhoud: string[] = [];
  if (!meta.opstelling) {
    // Geen plaatsingsdata: we weten niet of er een eiland is.
    if (frame) aannames.push("Verankeringsframe voor kookeiland in de lijst: eiland in het ontwerp, of te veel besteld? Controleren.");
  } else if (eiland) {
    const inEiland = pos.filter((p) => p.uuid && eilandUuids.has(p.uuid)).flatMap((p) => p.soorten);
    // Per aansluiting: spoelbak en vaatwasser → water en afvoer, kookplaat → stroom (Perilex).
    const erin = [
      ...(inEiland.some(isSpoelbak) ? ["spoelbak"] : []),
      ...(inEiland.some(isVaatwasser) ? ["vaatwasser"] : []),
      ...(inEiland.some(isKookplaat) ? ["kookplaat"] : []),
    ];
    eilandInhoud = erin;
    const nat = erin.includes("spoelbak") || erin.includes("vaatwasser");
    const stroom = erin.includes("kookplaat");
    const aansluiting = nat && stroom
      ? "water, afvoer en stroom moeten"
      : nat
        ? "water en afvoer moeten"
        : "stroom (Perilex) moet";
    aannames.push(
      erin.length
        ? `Eiland met ${opsomming(erin)}: ${aansluiting} vóór de montage in de vloer liggen.`
        : "Eiland/vrijstaand blok in het ontwerp."
    );
    if (!frame) aannames.push("Eiland zonder verankeringsframe: controleren of dat nodig is.");
  } else if (frame) {
    aannames.push("Verankeringsframe voor kookeiland besteld, maar geen eiland in het ontwerp: te veel besteld?");
  }

  // Eigen apparaten: een positie of kast zonder het apparaat dat erin hoort.
  // Liefst op de naam van de ASL-positie; zonder die namen op de ART-regels.
  const kookplaatAantal = kookplaten;
  const aantalVan: Record<Apparaat, number> = {
    vaatwasser: telling.vaatwasser,
    oven: telling.oven,
    "koelkast/vriezer": telling.koelkast_vriezer,
    kookplaat: kookplaatAantal,
  };
  const missend: Apparaat[] = [];
  if (pos.some((p) => p.naam)) {
    for (const { apparaat, positie } of APPARAAT_POSITIES) {
      const plekken = pos.filter((p) => p.naam && positie.test(p.naam)).length;
      if (plekken > aantalVan[apparaat]) missend.push(apparaat);
    }
  } else {
    const aantal = (soort: string) => tel(soortIs(soort));
    const hogeInbouw = aantal("hoge kast voor inbouwapparatuur");
    if (aantal("front voor vaatwasser") > 0 && telling.vaatwasser === 0) missend.push("vaatwasser");
    if ((hogeInbouw > 0 || aantal("console voor oven") > 0) && telling.oven === 0) missend.push("oven");
    if (hogeInbouw > telling.oven && telling.koelkast_vriezer === 0) missend.push("koelkast/vriezer");
    if (aantal("onderkast v inbouwapp/spoelbak") > spoelbakken && kookplaatAantal === 0) missend.push("kookplaat");
  }
  for (const apparaat of missend) aannames.push(eigenApparaat(apparaat));

  // Vangnet: niet geteld, niet bewust genegeerd, maar het lijkt op montagewerk.
  for (const a of artikelen) {
    if (geteld.has(a.dbId) || BEKEND_GENEGEERD.has(a.soort) || !VANGNET.test(a.soort)) continue;
    aannames.push(`Niet herkend, controleren: ${a.soort} (${a.artikelnummer})`);
  }

  aannames.push("Lichtlijst, sloop, scheve muren, kraanboring en afvoer/leidingwerk: niet af te leiden uit de planner, op 0");
  aannames.push(
    `Bron: IKEA planner-link${meta.projectNaam ? ` "${meta.projectNaam}"` : ""}` +
      (meta.datumOpgeslagen ? `, laatst opgeslagen ${meta.datumOpgeslagen.slice(0, 10)}` : "")
  );

  return { telling, artikelen, werkblad, prijscontrole: pc, eilandInhoud, verankeringsframe: frame };
}
