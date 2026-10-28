/**
 * Signalen voor Ilja op /admin/offerte. Intern: niets hiervan gaat letterlijk de
 * mail in (mail.ts kiest zelf zijn uitsluitingen). PUUR.
 *
 * Bewust NIET als controle: pootjes-aantallen (onbetrouwbaar in IKEA-exports).
 * De vaatwasserpositie telt al niet als onderkast (zie ikea-planner/telling.ts).
 */
import type { KeukenTelling } from "../rekenen.ts";
import type { Artikel } from "../ikea-planner/bom.ts";
import type { WerkbladSoort } from "../ikea-planner/telling.ts";

export interface SignaalInvoer {
  telling: KeukenTelling;
  artikelen: Artikel[]; // leeg bij de PDF-terugval: dan alleen signalen uit de telling
  werkblad: WerkbladSoort;
  eilandInhoud: string[]; // "spoelbak" | "vaatwasser" | "kookplaat"
  verankeringsframe: boolean;
}

export type SignaalNiveau = "bestelfout" | "buiten_scope" | "let_op";

export interface Signaal {
  id: string;
  niveau: SignaalNiveau;
  tekst: string;
}

/** Ophangrail in meters per bovenkast; daarbuiten is er mogelijk iets mis met de bestelling. */
export const HANGRAIL_RATIO = { min: 0.8, max: 1.2 } as const;
const RAIL_STANDAARD_CM = 200;

/** Meters ophangrail uit de artikellijst ("ophangrail, verzinkt, 200 cm" × aantal). */
export function hangrailMeter(artikelen: Artikel[]): number {
  let cm = 0;
  for (const a of artikelen.filter((x) => x.soort === "ophangrail")) {
    const lengte = Number(a.omschrijving.match(/(\d+(?:[.,]\d+)?)\s*cm/)?.[1]?.replace(",", "."));
    cm += a.aantal * (Number.isFinite(lengte) && lengte > 0 ? lengte : RAIL_STANDAARD_CM);
  }
  return Math.round(cm) / 100;
}

const aantalSoort = (artikelen: Artikel[], re: RegExp) =>
  artikelen.filter((a) => re.test(a.soort)).reduce((s, a) => s + a.aantal, 0);

export function bepaalSignalen(i: SignaalInvoer): Signaal[] {
  const { telling: t, artikelen } = i;
  const uit: Signaal[] = [];
  const voeg = (id: string, niveau: SignaalNiveau, tekst: string) => uit.push({ id, niveau, tekst });

  // ---- Bestelling ----
  if (artikelen.length && t.bovenkasten > 0) {
    const m = hangrailMeter(artikelen);
    const ratio = m / t.bovenkasten;
    if (ratio < HANGRAIL_RATIO.min - 1e-9 || ratio > HANGRAIL_RATIO.max + 1e-9) {
      voeg(
        "hangrail",
        "bestelfout",
        `Ophangrail ${m.toLocaleString("nl-NL")} m voor ${t.bovenkasten} bovenkast(en) = ${ratio.toLocaleString("nl-NL", { maximumFractionDigits: 2 })} m per bovenkast ` +
          `(verwacht 0,8–1,2): mogelijke bestelfout. Let op: IKEA zet ook rails bij onder- en hoge kasten.`
      );
    }
  }

  if (t.eiland > 0 && !i.verankeringsframe && artikelen.length) {
    voeg("eiland_zonder_frame", "bestelfout", "Eiland zonder verankeringsframe voor kookeiland: controleren of dat nodig is.");
  }
  if (i.verankeringsframe && t.eiland === 0) {
    voeg("frame_zonder_eiland", "bestelfout", "Verankeringsframe voor kookeiland besteld, maar geen eiland in het ontwerp: te veel besteld?");
  }

  // ---- Scope ----
  if (i.eilandInhoud.includes("spoelbak")) {
    voeg("eiland_spoelbak", "let_op", "Spoelbak in het eiland: water, afvoer en stroom moeten vóór de montage in de vloer liggen.");
  } else if (i.eilandInhoud.length) {
    voeg("eiland_aansluitingen", "let_op", `Eiland met ${i.eilandInhoud.join(" en ")}: aansluitingen moeten vóór de montage in de vloer liggen.`);
  }
  if (i.werkblad === "steen") {
    voeg("steen", "buiten_scope", "Steen/composiet/porselein werkblad: blad, uitsparingen en de aansluitingen na plaatsing vallen buiten scope.");
  }
  if (i.werkblad === "hout") {
    voeg("hout", "let_op", "Houten werkblad: de toeslag (€400–525) staat niet in de tarievenrij en zit niet in de prijs.");
  }
  if (t.inductie > 0) {
    voeg("inductie", "buiten_scope", "Inductiekookplaat: Perilex-aansluiting vereist, valt buiten scope (erkend elektricien).");
  }

  // ---- Opvallende combinaties (alleen met artikellijst) ----
  if (artikelen.length) {
    const vriezers = aantalSoort(artikelen, /^(onderbouw )?(diepvrieskast|vriezer)/);
    const koelkasten = aantalSoort(artikelen, /^(onderbouw )?(koelkast|koel- \/ diepvrieskast)/);
    if (vriezers >= 2 && koelkasten === 0) {
      voeg("vriezers_zonder_koelkast", "let_op", `${vriezers} vriezers en geen koelkast: klopt dat, of is er een koelkast vergeten?`);
    }
    const afzuigkappen = t.afzuigkap;
    const geintegreerd = artikelen.some((a) => /^inductiekookplaat\/geïnteg afzuigkap/.test(a.soort));
    const recirculatie = artikelen.some((a) => /^(koolstoffilter|recirculatiekit)/.test(a.soort));
    const afvoer = artikelen.some((a) => /^flexibele afvoerpijp/.test(a.soort));
    if (recirculatie && afvoer) {
      voeg("afzuig_conflict", "let_op", "Zowel recirculatie (koolstoffilter/recirculatiekit) als een afvoerpijp naar buiten besteld: welke wordt het?");
    }
    if (geintegreerd && afzuigkappen > 0) {
      voeg("dubbele_afzuiging", "let_op", "Kookplaat met geïntegreerde afzuiging én een losse afzuigkap: dubbel besteld?");
    }
    if ((recirculatie || afvoer) && afzuigkappen === 0 && !geintegreerd) {
      voeg("afzuig_toebehoren_zonder_kap", "let_op", "Afzuig-toebehoren besteld zonder afzuigkap: eigen afzuigkap of vergeten?");
    }
    const kookplaten = aantalSoort(artikelen, /kookplaat/) - aantalSoort(artikelen, /recirculatie|scheiding/);
    if (kookplaten >= 2) voeg("twee_kookplaten", "let_op", `${kookplaten} kookplaten in de lijst: bewust (domino) of dubbel besteld?`);
  }

  return uit;
}

/**
 * Vertrouwen in de telling voor dit scherm. De planner-route zet altijd "hoog";
 * hier zakt het naar gemiddeld als er iets niet herkend is of de BOM-prijs niet
 * klopt, en naar laag als er niets geteld is.
 */
export function beoordeelVertrouwen(
  telling: KeukenTelling,
  werkblad: WerkbladSoort
): { vertrouwen: KeukenTelling["vertrouwen"]; redenen: string[] } {
  const redenen: string[] = [];
  const kasten = telling.onderkasten + telling.bovenkasten + telling.hoge_kasten;
  if (kasten === 0) return { vertrouwen: "laag", redenen: ["Geen kasten geteld"] };
  for (const a of telling.aannames) {
    if (/^(Niet herkend|Geen productgegevens|Prijscontrole BOM wijkt af|Kastbreedte 90 cm)/.test(a)) redenen.push(a);
  }
  if (werkblad === "overig") redenen.push("Werkbladmateriaal niet herkend");
  if (telling.vertrouwen !== "hoog") redenen.unshift(`Lezing gaf vertrouwen ${telling.vertrouwen}`);
  const vertrouwen = telling.vertrouwen === "laag" ? "laag" : redenen.length ? "gemiddeld" : "hoog";
  return { vertrouwen, redenen };
}
