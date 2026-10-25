/**
 * Prijsadapter voor de site: de enige plek waar componenten bedragen vandaan halen.
 *
 * Bevat geen eigen prijsmodel. Bronnen:
 *  - IKEA-link: de uitkomst van Schakel 2 (`berekenPrijsUitTelling`, server-side
 *    met de actieve tarievenrij), via /api/ontwerp-lezen;
 *  - alles zonder bron in tarieven: prijs-tijdelijk.ts (RELEASE-BLOCKER), tot de
 *    dagenmodel-PR die bedragen in tarieven zet.
 *
 * PUUR en client-veilig: geen DB, geen netwerk, geen server-only imports.
 */

import type { PrijsResultaat } from "./rekenen.ts";
import { PRIJS_TIJDELIJK } from "./prijs-tijdelijk.ts";

export type Grootte = "<8" | "8-15" | "15+";
export type Opstelling = "recht" | "hoek" | "eiland";
export type Pakket = "compleet" | "montageklaar";
export type TypeKlus = "complete_ikea_keuken" | "andere_bouwpakketkeuken" | "alleen_afmonteren" | "losse_klus";
export type ExtraKey = keyof typeof PRIJS_TIJDELIJK.extras;
export type WerkbladSoort = "geen" | "steen" | "maatwerk_laminaat" | "laminaat_op_locatie" | "hout" | "overig";

/** Wat de klant ziet: een band, een vaste prijs (laag = hoog) of een vanaf-prijs. */
export type Getoond =
  | { soort: "band"; laag: number; hoog: number }
  | { soort: "vast"; bedrag: number }
  | { soort: "vanaf"; vanaf: number };

/** "€ 2.775", zoals in de mockup (spatie na het euroteken, geen centen). */
export function euro(n: number): string {
  return "€ " + Math.round(n).toLocaleString("nl-NL", { maximumFractionDigits: 0 });
}

export function toonBedrag(g: Getoond): string {
  if (g.soort === "vast") return euro(g.bedrag);
  if (g.soort === "vanaf") return `vanaf ${euro(g.vanaf)}`;
  return `${euro(g.laag)} – ${euro(g.hoog)}`;
}

/** Voor de kolommen prijs_getoond_laag/hoog (0018). Een vanaf-prijs heeft geen bovengrens: laag = hoog = vanaf. */
export function naarKolommen(g: Getoond | null): { prijs_getoond_laag: number | null; prijs_getoond_hoog: number | null } {
  if (!g) return { prijs_getoond_laag: null, prijs_getoond_hoog: null };
  if (g.soort === "vast") return { prijs_getoond_laag: g.bedrag, prijs_getoond_hoog: g.bedrag };
  if (g.soort === "vanaf") return { prijs_getoond_laag: g.vanaf, prijs_getoond_hoog: g.vanaf };
  return { prijs_getoond_laag: g.laag, prijs_getoond_hoog: g.hoog };
}

// ---------------------------------------------------------------------------
// Extra's
// ---------------------------------------------------------------------------

export interface ExtraOptie {
  key: ExtraKey;
  label: string;
  kort: string;
  sub: string;
  bedrag: number;
}

export const EXTRA_OPTIES: ExtraOptie[] = [
  { key: "demontage", label: "Oude keuken demonteren en afvoeren", kort: "Oude keuken eruit", sub: "Inclusief container", bedrag: PRIJS_TIJDELIJK.extras.demontage },
  { key: "apparaten", label: "Apparaten aansluiten", kort: "Apparaten aansluiten", sub: "Oven, kookplaat, vaatwasser, koelkast. Zit al in de prijs.", bedrag: PRIJS_TIJDELIJK.extras.apparaten },
  { key: "spoelbak", label: "Spoelbak en kraan aansluiten", kort: "Spoelbak en kraan", sub: "Op bestaande afvoer en water. Zit al in de prijs.", bedrag: PRIJS_TIJDELIJK.extras.spoelbak },
  { key: "werkblad_zagen", label: "Werkblad op maat zagen", kort: "Werkblad op maat zagen", sub: "Laminaat dat ter plekke gezaagd moet worden. Voorgezaagd is inbegrepen.", bedrag: PRIJS_TIJDELIJK.extras.werkblad_zagen },
  { key: "leiding", label: "Lichte leidingaanpassing", kort: "Leidingaanpassing", sub: "Kleine aanpassing aan water of afvoer", bedrag: PRIJS_TIJDELIJK.extras.leiding },
];

/** "+ € 995" of "Inbegrepen". */
export const extraLabel = (bedrag: number) => (bedrag > 0 ? `+ ${euro(bedrag)}` : "Inbegrepen");

export const demontageBedrag = (): number => PRIJS_TIJDELIJK.extras.demontage;

// ---------------------------------------------------------------------------
// Bonregels
// ---------------------------------------------------------------------------

export interface BonRegel {
  label: string;
  waarde: string;
}

// ---------------------------------------------------------------------------
// Vragenroute
// ---------------------------------------------------------------------------

export interface VragenInvoer {
  klus: TypeKlus;
  grootte: Grootte;
  extras: Partial<Record<ExtraKey, boolean>>;
}

/** Band (of vanaf-prijs) voor de vragenroute, plus de extra's als bonregels. */
export function vragenIndicatie(inv: VragenInvoer): { getoond: Getoond; regels: BonRegel[] } {
  const extraSom = EXTRA_OPTIES.filter((e) => inv.extras[e.key]).reduce((s, e) => s + e.bedrag, 0);
  const regels: BonRegel[] = EXTRA_OPTIES.filter((e) => inv.extras[e.key]).map((e) => ({
    label: e.kort,
    waarde: e.bedrag > 0 ? `+${euro(e.bedrag).replace("€ ", "€")}` : "inbegrepen",
  }));

  if (inv.klus === "losse_klus") {
    return { getoond: { soort: "vanaf", vanaf: PRIJS_TIJDELIJK.losseKlusVanaf + extraSom }, regels };
  }
  const band = inv.klus === "alleen_afmonteren" ? PRIJS_TIJDELIJK.afmonteren : PRIJS_TIJDELIJK.banden[inv.grootte];
  return { getoond: { soort: "band", laag: band.laag + extraSom, hoog: band.hoog + extraSom }, regels };
}

/** De basisregel op de bon, zonder extra's ("€1.775–2.095" of "vanaf €350"). */
export function vragenBasisWaarde(klus: TypeKlus, grootte: Grootte): string {
  if (klus === "losse_klus") return `vanaf ${euro(PRIJS_TIJDELIJK.losseKlusVanaf).replace("€ ", "€")}`;
  const b = klus === "alleen_afmonteren" ? PRIJS_TIJDELIJK.afmonteren : PRIJS_TIJDELIJK.banden[grootte];
  return `${euro(b.laag).replace("€ ", "€")}–${euro(b.hoog).replace("€ ", "")}`;
}

// ---------------------------------------------------------------------------
// PDF-route (asynchroon: geen lezing vóór het verzenden, dus een band)
// ---------------------------------------------------------------------------

export function ontwerpBand(grootte: Grootte, pakket: Pakket, demontage: boolean): Getoond {
  const b = PRIJS_TIJDELIJK.banden[grootte];
  const korting = pakket === "montageklaar" ? PRIJS_TIJDELIJK.montageklaarScheeltOngeveer : 0;
  const extra = demontage ? PRIJS_TIJDELIJK.extras.demontage : 0;
  return { soort: "band", laag: b.laag - korting + extra, hoog: b.hoog - korting + extra };
}

// ---------------------------------------------------------------------------
// IKEA-link: Schakel 2
// ---------------------------------------------------------------------------

/** Pakketprijzen voor de link-route, of null als er geen bedrag getoond mag worden. */
export interface LinkPrijzen {
  compleet: number;
  montageklaar: number;
  werkbladZagen: number; // 0 als het werkblad voorgezaagd is of er geen is
}

/**
 * Van Schakel 2 naar wat de klant ziet. Alleen bij vertrouwen "hoog" een vaste
 * prijs: een te lage vaste prijs is erger dan geen bedrag. `toonPrijs` is
 * TOON_PRIJS_BIJ_LINK (ikea-planner/verwerker.ts), server-side doorgegeven.
 */
export function linkPrijzen(prijs: PrijsResultaat, werkblad: WerkbladSoort, toonPrijs: boolean): LinkPrijzen | null {
  if (!toonPrijs || prijs.vertrouwen !== "hoog") return null;
  return {
    compleet: Math.round(prijs.compleet.incl),
    montageklaar: Math.round(prijs.montageklaar.incl),
    werkbladZagen: werkblad === "laminaat_op_locatie" ? PRIJS_TIJDELIJK.extras.werkblad_zagen : 0,
  };
}

export function linkGetoond(p: LinkPrijzen | null, pakket: Pakket, demontage: boolean): Getoond | null {
  if (!p) return null;
  return { soort: "vast", bedrag: p[pakket] + p.werkbladZagen + (demontage ? PRIJS_TIJDELIJK.extras.demontage : 0) };
}

// ---------------------------------------------------------------------------
// Teksten op de site (Kosten, FAQ, stadspagina's)
// ---------------------------------------------------------------------------

export interface KostenKaart {
  grootte: Grootte;
  titel: string;
  sub: string;
  band: string;
}

export function kostenKaarten(): KostenKaart[] {
  const b = PRIJS_TIJDELIJK.banden;
  return [
    { grootte: "<8", titel: "Kleine keuken", sub: "Tot 8 kasten, rechte opstelling", band: `${euro(b["<8"].laag)} – ${euro(b["<8"].hoog)}` },
    { grootte: "8-15", titel: "Gemiddelde keuken", sub: "8 tot 15 kasten, L- of U-vorm", band: `${euro(b["8-15"].laag)} – ${euro(b["8-15"].hoog)}` },
    { grootte: "15+", titel: "Grote keuken", sub: "15 kasten of meer, met kookeiland", band: `${euro(b["15+"].laag)} – ${euro(b["15+"].hoog)}` },
  ];
}

/** Losse bedragen voor lopende tekst ("ongeveer € 700 minder", "€ 995 extra"). */
export function tekstBedragen() {
  const b = PRIJS_TIJDELIJK.banden;
  return {
    montageklaarScheelt: euro(PRIJS_TIJDELIJK.montageklaarScheeltOngeveer),
    demontage: euro(PRIJS_TIJDELIJK.extras.demontage),
    werkbladZagen: euro(PRIJS_TIJDELIJK.extras.werkblad_zagen),
    losseKlusVanaf: euro(PRIJS_TIJDELIJK.losseKlusVanaf),
    afmonteren: `${euro(PRIJS_TIJDELIJK.afmonteren.laag)} – ${euro(PRIJS_TIJDELIJK.afmonteren.hoog)}`,
    klein: `${euro(b["<8"].laag)} – ${euro(b["<8"].hoog)}`,
    gemiddeld: `${euro(b["8-15"].laag)} – ${euro(b["8-15"].hoog)}`,
    groot: `${euro(b["15+"].laag)} – ${euro(b["15+"].hoog)}`,
    laagsteBand: euro(b["<8"].laag),
    hoogsteBand: euro(b["15+"].hoog),
  };
}
