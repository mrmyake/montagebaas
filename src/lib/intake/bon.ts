/**
 * De bon (desktop) en de prijsbalk (mobiel) van de intake. PUUR: alle bedragen
 * via prijs-weergave.ts, alle keuzes via velden.ts.
 */
import {
  EXTRA_OPTIES,
  euro,
  linkGetoond,
  ontwerpBand,
  toonBedrag,
  vragenBasisWaarde,
  vragenIndicatie,
  type BonRegel,
  type ExtraKey,
  type Getoond,
  type Grootte,
  type LinkPrijzen,
  type Opstelling,
  type Pakket,
  type TypeKlus,
} from "../prijs-weergave.ts";
import { GROOTTE_OPTIES, KLUS_OPTIES, OPSTELLING_OPTIES, PAKKET_OPTIES, PERIODE_OPTIES, type Periode } from "./velden.ts";

export type Route = "link" | "pdf" | "vragen";

export interface BonInvoer {
  route: Route;
  stap: number;
  link: { bon: BonRegel[]; prijzen: LinkPrijzen | null } | null;
  aantalBestanden: number;
  pakket: Pakket;
  demontage: boolean;
  klus: TypeKlus;
  grootte: Grootte | null;
  opstelling: Opstelling | null;
  extras: Partial<Record<ExtraKey, boolean>>;
  periode: Periode | null;
}

export interface Bon {
  /** Tekst als er nog niets te rekenen valt; dan zijn de andere velden leeg. */
  leeg: string | null;
  regels: BonRegel[];
  prijsLabel: string;
  prijsTekst: string;
  altTekst: string | null;
  balkLabel: string;
  balkPrijs: string;
  /** Grijs in de balk: er staat (nog) geen bedrag. */
  gedempt: boolean;
  /** Wat de klant ziet; null als er geen bedrag staat. Gaat mee als prijs_getoond. */
  getoond: Getoond | null;
}

const kort = (e: string) => e.replace("€ ", "€");
const label = <T extends string>(opties: { value: T; label: string }[], v: T | null) => opties.find((o) => o.value === v)?.label ?? "";
const anderPakket = (p: Pakket): Pakket => (p === "compleet" ? "montageklaar" : "compleet");

function planning(inv: BonInvoer, vanafStap: number): BonRegel[] {
  if (inv.stap < vanafStap || !inv.periode) return [];
  return [{ label: "Planning", waarde: label(PERIODE_OPTIES, inv.periode).toLowerCase() }];
}

function leeg(tekst: string, balkPrijs: string): Bon {
  return { leeg: tekst, regels: [], prijsLabel: "", prijsTekst: "", altTekst: null, balkLabel: "Jouw prijs", balkPrijs, gedempt: true, getoond: null };
}

export function bouwBon(inv: BonInvoer): Bon {
  const pakketNaam = label(PAKKET_OPTIES, inv.pakket);

  if (inv.route === "link") {
    if (inv.stap === 1 || !inv.link) return leeg("Plak je link of upload je ontwerp. Dan rekenen we je bon uit.", "na het lezen van je ontwerp");
    const p = inv.link.prijzen;
    const getoond = linkGetoond(p, inv.pakket, inv.demontage);
    const regels: BonRegel[] = [
      ...inv.link.bon,
      { label: pakketNaam, waarde: p ? kort(euro(p[inv.pakket])) : "prijs volgt" },
      ...(p && p.werkbladZagen ? [{ label: "Werkblad op maat zagen", waarde: `+${kort(euro(p.werkbladZagen))}` }] : []),
      ...(inv.demontage ? [{ label: "Oude keuken eruit", waarde: p ? `+${kort(euro(EXTRA_OPTIES[0].bedrag))}` : "gekozen" }] : []),
      ...planning(inv, 4),
    ];
    const ander = linkGetoond(p, anderPakket(inv.pakket), inv.demontage);
    return {
      leeg: null,
      regels,
      prijsLabel: `Jouw prijs, ${pakketNaam}`,
      prijsTekst: getoond ? toonBedrag(getoond) : "Volgt binnen 24 uur",
      altTekst: ander ? `${label(PAKKET_OPTIES, anderPakket(inv.pakket))}: ${toonBedrag(ander)}` : null,
      balkLabel: getoond ? `${pakketNaam}, incl. btw` : pakketNaam,
      balkPrijs: getoond ? toonBedrag(getoond) : "vaste prijs binnen 24 uur",
      gedempt: !getoond,
      getoond,
    };
  }

  if (inv.route === "pdf") {
    if (inv.stap === 1) return leeg("Plak je link of upload je ontwerp. Dan rekenen we je bon uit.", "na een paar korte vragen");
    if (!inv.grootte) return leeg("Kies hoe groot je keuken is. Dan rekenen we je bon uit.", "kies je keukengrootte");
    const getoond = ontwerpBand(inv.grootte, inv.pakket, inv.demontage);
    const ander = ontwerpBand(inv.grootte, anderPakket(inv.pakket), inv.demontage);
    const g = GROOTTE_OPTIES.find((o) => o.value === inv.grootte)!;
    const regels: BonRegel[] = [
      { label: "Ontwerp", waarde: inv.aantalBestanden === 1 ? "1 bestand" : `${inv.aantalBestanden} bestanden` },
      { label: "Keuken", waarde: [g.kort, inv.opstelling ? label(OPSTELLING_OPTIES, inv.opstelling).toLowerCase() : null].filter(Boolean).join(", ") },
      { label: pakketNaam, waarde: kort(toonBedrag(ontwerpBand(inv.grootte, inv.pakket, false))).replace(" – € ", "–") },
      ...(inv.demontage ? [{ label: "Oude keuken eruit", waarde: `+${kort(euro(EXTRA_OPTIES[0].bedrag))}` }] : []),
      ...planning(inv, 4),
    ];
    return {
      leeg: null,
      regels,
      prijsLabel: `Indicatie, ${pakketNaam}`,
      prijsTekst: toonBedrag(getoond),
      altTekst: `${label(PAKKET_OPTIES, anderPakket(inv.pakket))}: ${toonBedrag(ander)}`,
      balkLabel: "Indicatie, incl. btw",
      balkPrijs: toonBedrag(getoond),
      gedempt: false,
      getoond,
    };
  }

  // Vragenroute
  if (!inv.grootte) return leeg("Kies je klus en je keuken. Dan rekenen we je bon uit.", "kies je keuken");
  const { getoond, regels: extraRegels } = vragenIndicatie({ klus: inv.klus, grootte: inv.grootte, extras: inv.extras });
  const klus = KLUS_OPTIES.find((o) => o.value === inv.klus)!;
  const g = GROOTTE_OPTIES.find((o) => o.value === inv.grootte)!;
  const basisLabel =
    inv.klus === "losse_klus"
      ? klus.kort
      : [klus.kort, g.kort, inv.opstelling ? label(OPSTELLING_OPTIES, inv.opstelling).toLowerCase() : null].filter(Boolean).join(", ");
  return {
    leeg: null,
    regels: [{ label: basisLabel, waarde: vragenBasisWaarde(inv.klus, inv.grootte) }, ...extraRegels, ...planning(inv, 4)],
    prijsLabel: "Indicatie",
    prijsTekst: toonBedrag(getoond),
    altTekst: null,
    balkLabel: "Indicatie, incl. btw",
    balkPrijs: toonBedrag(getoond),
    gedempt: false,
    getoond,
  };
}
