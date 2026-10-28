/**
 * Schakel 3 voor /admin/offerte: de klantmail in twee varianten (uitgebreid en
 * compact). Stijl en opbouw volgen de skill `ikea-keuken-offerte`
 * (references/email.md, scope.md), met de regels uit de opdracht voor deze tool
 * erbovenop: merk De Keukenheld, geen dagen, één prijs per pakket, vaste slotzin
 * onder het prijsblok, oude keuken alleen als die meegenomen wordt.
 *
 * PUUR en deterministisch: dezelfde invoer geeft dezelfde tekst, en
 * `controleerMail` toetst ook een met de hand bewerkte tekst op dezelfde regels.
 */
import type { KeukenTelling } from "../rekenen.ts";
import type { WerkbladSoort } from "../ikea-planner/telling.ts";
import { euro } from "../pricing.ts";

export const MERKNAAM = "De Keukenheld";
export const PRIJS_SLOTZIN = "Beide prijzen zijn inclusief btw en reiskosten, zonder verrassingen achteraf.";
const AFSLUITING = `Groet,\nIlja\n${MERKNAAM}`;

export type MailVariant = "uitgebreid" | "compact";

export interface OpenVraag {
  id: string;
  tekst: string;
  standaardAan: boolean;
}

export interface MailInvoer {
  naam: string;
  telling: KeukenTelling;
  werkblad: WerkbladSoort;
  eilandInhoud: string[];
  compleet: number;
  montageklaar: number;
  oudeKeuken: boolean;
  amsterdam: boolean;
  vragen: OpenVraag[]; // alleen de aangevinkte
}

/** Bedrag zonder harde spatie, zodat het in platte tekst overal hetzelfde oogt. */
export const bedragTekst = (n: number) => euro(n).replace(/ /g, " ");

/** ["a", "b", "c"] → "a, b en c" */
export const opsomming = (xs: string[]) =>
  xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} en ${xs.at(-1)}`;

const meervoud = (n: number, enkel: string, meer: string) => `${n.toLocaleString("nl-NL")} ${n === 1 ? enkel : meer}`;

export function kastenTekst(t: KeukenTelling): string {
  const delen = [
    t.onderkasten ? meervoud(t.onderkasten, "onderkast", "onderkasten") : null,
    t.bovenkasten ? meervoud(t.bovenkasten, "bovenkast", "bovenkasten") : null,
    t.hoge_kasten ? meervoud(t.hoge_kasten, "hoge kast", "hoge kasten") : null,
  ].filter((x): x is string => !!x);
  return delen.length ? opsomming(delen) : "de kasten uit je ontwerp";
}

function apparaten(t: KeukenTelling): string[] {
  return [
    t.vaatwasser ? "vaatwasser" : null,
    t.oven ? "oven" : null,
    t.magnetron ? "magnetron" : null,
    t.koelkast_vriezer ? "koelkast" : null,
    t.inductie || t.gaskookplaat ? "kookplaat" : null,
    t.afzuigkap ? "afzuigkap" : null,
  ].filter((x): x is string => !!x);
}

function werkbladDeel(w: WerkbladSoort): string | null {
  switch (w) {
    case "laminaat_op_locatie":
      return "het op maat zagen en plaatsen van het laminaat werkblad";
    case "maatwerk_laminaat":
      return "het plaatsen van het voorgezaagde werkblad";
    case "hout":
      return "het plaatsen van het houten werkblad";
    default:
      return null;
  }
}

function scope(i: MailInvoer): { kort: string; inbegrepen: string[] } {
  const kort = `een keuken met ${kastenTekst(i.telling)}${i.telling.eiland ? ", inclusief een eiland" : ""}`;
  const app = apparaten(i.telling);
  const inbegrepen = [
    werkbladDeel(i.werkblad),
    app.length ? `het inbouwen van de ${opsomming(app)}` : null,
    i.oudeKeuken ? "het verwijderen van je oude keuken" : null,
  ].filter((x): x is string => !!x);
  return { kort, inbegrepen };
}

/** Uitsluitingen als volzinnen, belangrijkste eerst. */
export function uitsluitingen(i: Pick<MailInvoer, "telling" | "werkblad" | "eilandInhoud" | "amsterdam">): string[] {
  const zinnen: string[] = [];
  if (i.eilandInhoud.includes("spoelbak")) {
    zinnen.push("Voor de spoelbak in het eiland is het belangrijk dat water, afvoer en stroom al in de vloer liggen voordat ik begin.");
  } else if (i.eilandInhoud.length) {
    zinnen.push(`Voor de ${opsomming(i.eilandInhoud)} in het eiland moeten de aansluitingen al in de vloer liggen voordat ik begin.`);
  }
  if (i.werkblad === "steen") {
    zinnen.push(
      "Het werkblad van steen, composiet of porselein meet de leverancier zelf in en plaatst hij ook, net als de uitsparingen en het aansluiten van spoelbak en kookplaat na plaatsing. Dat valt buiten mijn werk."
    );
  }
  if (i.telling.inductie > 0) {
    zinnen.push("De inductiekookplaat heeft een Perilex-aansluiting nodig. Die legt een erkend elektricien aan, ook dat valt buiten de prijs.");
  }
  zinnen.push("Het aansluiten van water en elektra doet een installateur, dat valt buiten mijn werk.");
  if (i.amsterdam) zinnen.push("Parkeerkosten in Amsterdam zijn niet bij de prijs inbegrepen.");
  return zinnen;
}

/**
 * Vragen die de mail kan stellen. Alleen wat echt nodig is staat standaard aan;
 * op het scherm is elke vraag met een vinkje weg te laten.
 */
export function bepaalOpenVragen(i: {
  telling: KeukenTelling;
  werkblad: WerkbladSoort;
  eilandInhoud: string[];
  metArtikellijst: boolean;
  afzuigOnduidelijk: boolean;
}): OpenVraag[] {
  const vragen: OpenVraag[] = [];
  const eigen = i.telling.aannames
    .map((a) => a.match(/^Geen (vaatwasser|oven|koelkast\/vriezer|kookplaat) in de lijst/)?.[1])
    .filter((x): x is string => !!x)
    .map((x) => (x === "koelkast/vriezer" ? "koelkast" : x));
  if (eigen.length) {
    vragen.push({
      id: "eigen_apparaten",
      tekst: `In de lijst zie ik geen ${opsomming(eigen)}. Regel je die zelf? Dan hoor ik graag welk merk en type het worden, voor de nismaten.`,
      standaardAan: true,
    });
  }
  if (!i.metArtikellijst) {
    vragen.push({
      id: "apparatuur",
      tekst: "Ik ben benieuwd welke apparatuur je hebt gekozen, dus welke koelkast, oven, kookplaat en afzuigkap het worden qua type.",
      standaardAan: true,
    });
  }
  if (i.eilandInhoud.length) {
    vragen.push({
      id: "eiland_vloer",
      tekst: "Liggen de aansluitingen voor het eiland al in de vloer, of wordt dat nog geregeld?",
      standaardAan: true,
    });
  }
  if (i.telling.afzuigkap > 0) {
    vragen.push({
      id: "afzuigkap",
      tekst: "Gaat de afzuigkap afvoeren naar buiten, of wordt het recirculatie?",
      standaardAan: i.afzuigOnduidelijk,
    });
  }
  if (i.werkblad === "overig" || i.werkblad === "geen") {
    vragen.push({
      id: "werkblad",
      tekst: "Welk werkblad heb je gekozen? Dat bepaalt of ik het op locatie op maat zaag.",
      standaardAan: i.werkblad === "overig",
    });
  }
  vragen.push({
    id: "planning",
    tekst: "Welke periode had je in gedachten voor de montage?",
    standaardAan: false,
  });
  return vragen;
}

const voornaam = (naam: string) => naam.trim() || "daar";

function prijsblok(i: MailInvoer, variant: MailVariant): string {
  if (variant === "compact") {
    return [
      `Compleet: ${bedragTekst(i.compleet)}. Ik zet alles in elkaar en monteer de hele keuken.`,
      `Montageklaar: ${bedragTekst(i.montageklaar)}. Jij zet de kastframes zelf in elkaar, ik doe de rest.`,
      "",
      PRIJS_SLOTZIN,
    ].join("\n");
  }
  return [
    `Compleet: ${bedragTekst(i.compleet)}`,
    "Ik zet alle kastframes in elkaar en monteer de complete keuken. Jij hoeft niets voor te bereiden aan de kasten zelf.",
    "",
    `Montageklaar: ${bedragTekst(i.montageklaar)}`,
    "Jij zet de kastframes vooraf zelf in elkaar en ik doe de rest: plaatsen, stellen, fronten afhangen, werkblad, spoelbak en apparatuur inbouwen.",
    "",
    PRIJS_SLOTZIN,
  ].join("\n");
}

export function maakMail(i: MailInvoer, variant: MailVariant): string {
  const s = scope(i);
  const alineas: string[] = [`Hej ${voornaam(i.naam)},`];

  if (variant === "uitgebreid") {
    alineas.push("Dank voor je aanvraag en voor het delen van je IKEA keukenontwerp. Ik heb het bekeken en kan je een vaste prijs geven.");
    alineas.push(
      `Het gaat om ${s.kort}.` +
        (s.inbegrepen.length ? ` In de prijs zit ook ${opsomming(s.inbegrepen)}.` : "") +
        " Daar bied ik twee pakketten voor aan."
    );
    alineas.push(prijsblok(i, variant));
    alineas.push(uitsluitingen(i).join(" "));
    if (i.vragen.length) alineas.push(i.vragen.map((v) => v.tekst).join("\n\n"));
    alineas.push("Ik hoor graag wat je ervan vindt en welk pakket je aanspreekt.");
  } else {
    alineas.push(
      `Dank voor je aanvraag. Ik heb je IKEA ontwerp bekeken en kan je een vaste prijs geven voor ${s.kort}` +
        (s.inbegrepen.length ? `, inclusief ${opsomming(s.inbegrepen)}.` : ".")
    );
    alineas.push(prijsblok(i, variant));
    // Compact: de twee belangrijkste uitsluitingen plus water/elektra en parkeren.
    const alle = uitsluitingen(i);
    const vast = alle.filter((z) => /^Het aansluiten van water|^Parkeerkosten/.test(z));
    const rest = alle.filter((z) => !vast.includes(z)).slice(0, 2);
    alineas.push([...rest, ...vast].join(" "));
    if (i.vragen.length) alineas.push(i.vragen.map((v) => v.tekst).join(" "));
    alineas.push("Ik hoor graag van je.");
  }

  alineas.push(AFSLUITING);
  return alineas.join("\n\n");
}

/** Onderwerp van een nieuwe draft. Een reply krijgt "Re: <onderwerp van de thread>". */
export const onderwerpNieuw = (plaats: string | null) =>
  plaats ? `Offerte keukenmontage - ${plaats}` : "Offerte keukenmontage";

export const onderwerpReply = (onderwerp: string) => (/^re:/i.test(onderwerp.trim()) ? onderwerp.trim() : `Re: ${onderwerp.trim()}`);

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Eenvoudige HTML: één <p> per alinea, regeleinden als <br>. */
export function mailNaarHtml(tekst: string): string {
  const alineas = tekst
    .trim()
    .split(/\n{2,}/)
    .map((a) => `<p style="margin:0 0 14px">${escHtml(a).replace(/\n/g, "<br>")}</p>`);
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1a1c20">${alineas.join("")}</div>`;
}

// ---------------------------------------------------------------------------
// Controle (ook op met de hand bewerkte tekst)
// ---------------------------------------------------------------------------

const GEBIEDEND = [
  /\bstuur\b/i,
  /\blaat (het )?(me |mij )?(even )?weten\b/i,
  /\bgeef (me |mij )?(even )?door\b/i,
  /(^|[.!?]\s+|\n)(bel|mail|app|geef|stuur|laat|kijk|neem|vul)\s/i,
];

export function controleerMail(tekst: string, opties: { oudeKeuken: boolean; amsterdam: boolean }): string[] {
  const p: string[] = [];
  if (!/^Hej [^\s,][^,\n]*,/.test(tekst.trim())) p.push('Aanhef moet "Hej [naam]," zijn');
  if (/[—–]/.test(tekst)) p.push("Bevat een em-dash of en-dash");
  if (/montagebaas/i.test(tekst)) p.push("Noemt Montagebaas");
  if (/\b(u|uw)\b/.test(tekst)) p.push("Bevat u/uw in plaats van je/jij");
  for (const re of GEBIEDEND) {
    const m = tekst.match(re);
    if (m) p.push(`Gebiedende wijs: "${m[0].trim()}"`);
  }
  if (/\bwerkdag|\b\d+([,.]\d+)?\s*dag(en)?\b|\bhalve dag\b/i.test(tekst)) p.push("Noemt dagen");
  if (!tekst.includes(PRIJS_SLOTZIN)) p.push("Slotzin onder het prijsblok ontbreekt");
  const bedragen = tekst.match(/€\s?\d/g) ?? [];
  if (bedragen.length !== 2) p.push(`Verwacht precies twee bedragen (één per pakket), gevonden: ${bedragen.length}`);
  if (/verpakking/i.test(tekst)) p.push("Noemt verpakkingsmateriaal");
  if (!opties.oudeKeuken && /oude keuken|demontage|slopen|sloop/i.test(tekst)) p.push("Noemt de oude keuken terwijl die niet meegenomen wordt");
  if (opties.amsterdam && !/parkeerkosten/i.test(tekst)) p.push("Amsterdam: parkeerkosten niet uitgesloten");
  return p;
}
