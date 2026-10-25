/**
 * Prijsadapter voor de site: de enige plek waar componenten bedragen vandaan halen.
 *
 * Bevat geen eigen prijsmodel. Alle bedragen komen uit de actieve tarievenrij
 * (montagebaas.tarieven, het dagenmodel) of uit Schakel 2:
 *  - banden, toeslagen en inbegrepen posten: `prijsbronUitTarieven` maakt er een
 *    Prijsbron van (server-side geladen, zie prijs-bron.ts, en als prop naar de client);
 *  - Montageklaar: Compleet min basis.montageklaar_min_dagen, met de afronding
 *    van Schakel 2 (rondPrijsAf);
 *  - IKEA-link: de uitkomst van berekenPrijsUitTelling, via /api/ontwerp-lezen.
 *
 * Geen bedrag in de bron = geen bedrag op de site ("Prijs volgt binnen 24 uur").
 *
 * PUUR en client-veilig: geen DB, geen netwerk, geen server-only imports.
 */

import { rondPrijsAf, type PrijsResultaat, type Tarieven } from "./rekenen.ts";

export type Grootte = "<8" | "8-14" | "15+";
export type Opstelling = "recht" | "hoek" | "eiland";
export type Pakket = "compleet" | "montageklaar";
export type TypeKlus = "complete_ikea_keuken" | "andere_bouwpakketkeuken" | "alleen_afmonteren" | "losse_klus";
export type ExtraKey = "demontage" | "apparaten" | "spoelbak" | "werkblad_zagen" | "leiding";
export type WerkbladSoort = "geen" | "steen" | "maatwerk_laminaat" | "laminaat_op_locatie" | "hout" | "overig";

export const GROOTTES: Grootte[] = ["<8", "8-14", "15+"];

/** Wat de klant ziet: een band of een vaste prijs (laag = hoog). */
export type Getoond = { soort: "band"; laag: number; hoog: number } | { soort: "vast"; bedrag: number };

/** Alle bedragen die de site nodig heeft, incl. btw. Serialiseerbaar (server → client). */
export interface Prijsbron {
  tarievenId: string;
  /** Compleet per keukengrootte, met de offertedagen die erbij horen. */
  banden: Record<Grootte, { laag: number; hoog: number; laag_dagen: number; hoog_dagen: number }>;
  /** Montageklaar per keukengrootte (Compleet min montageklaar_min_dagen). */
  montageklaarBanden: Record<Grootte, { laag: number; hoog: number }>;
  /** Voor lopende tekst: een dag minder, afgerond op €50. */
  montageklaarScheeltOngeveer: number;
  demontage: number;
  werkbladZagen: number;
  inbegrepen: { apparaten: boolean; spoelbak: boolean };
}

const BAND_SLEUTEL: Record<Grootte, "klein" | "gemiddeld" | "groot"> = { "<8": "klein", "8-14": "gemiddeld", "15+": "groot" };

/**
 * Tarievenrij → Prijsbron. Gooit als de rij een sleutel mist die de site nodig
 * heeft: liever een kapotte build dan een verzonnen bedrag.
 */
export function prijsbronUitTarieven(id: string, tar: Tarieven): Prijsbron {
  const b = tar.basis;
  const banden = tar.indicatiebanden;
  const sloop = tar.toeslagen?.sloop_incl;
  const zagen = tar.toeslagen?.werkblad_zagen_incl;
  const minDagen = b.montageklaar_min_dagen;
  if (!banden || sloop === undefined || zagen === undefined || minDagen === undefined) {
    throw new Error(`Tarievenrij ${id} mist indicatiebanden, toeslagen of basis.montageklaar_min_dagen`);
  }
  const eindes = b.prijs_eindigt_op ?? [25, 75, 95];
  // Zelfde formule als het dagenmodel in rekenen.ts: (dagen × dagtarief + voorrij) × (1 + btw), afgerond.
  const pakketVoorDagen = (dagen: number) => rondPrijsAf((dagen * b.dagtarief_excl + b.voorrij_excl) * (1 + b.btw), eindes);

  const per = <T,>(f: (g: Grootte) => T) => Object.fromEntries(GROOTTES.map((g) => [g, f(g)])) as Record<Grootte, T>;
  return {
    tarievenId: id,
    banden: per((g) => {
      const x = banden[BAND_SLEUTEL[g]];
      return { laag: x.laag, hoog: x.hoog, laag_dagen: x.laag_dagen, hoog_dagen: x.hoog_dagen };
    }),
    montageklaarBanden: per((g) => ({
      laag: pakketVoorDagen(banden[BAND_SLEUTEL[g]].laag_dagen - minDagen),
      hoog: pakketVoorDagen(banden[BAND_SLEUTEL[g]].hoog_dagen - minDagen),
    })),
    montageklaarScheeltOngeveer: Math.round((minDagen * b.dagtarief_excl * (1 + b.btw)) / 50) * 50,
    demontage: sloop,
    werkbladZagen: zagen,
    inbegrepen: {
      apparaten: tar.inbegrepen?.includes("apparaten") ?? false,
      spoelbak: tar.inbegrepen?.includes("spoelbak_kraan") ?? false,
    },
  };
}

/** "€ 2.775", zoals in de mockup (spatie na het euroteken, geen centen). */
export function euro(n: number): string {
  return "€ " + Math.round(n).toLocaleString("nl-NL", { maximumFractionDigits: 0 });
}

const band = (b: { laag: number; hoog: number }) => `${euro(b.laag)} – ${euro(b.hoog)}`;

export function toonBedrag(g: Getoond): string {
  return g.soort === "vast" ? euro(g.bedrag) : band(g);
}

/** Voor de kolommen prijs_getoond_laag/hoog (0018). */
export function naarKolommen(g: Getoond | null): { prijs_getoond_laag: number | null; prijs_getoond_hoog: number | null } {
  if (!g) return { prijs_getoond_laag: null, prijs_getoond_hoog: null };
  if (g.soort === "vast") return { prijs_getoond_laag: g.bedrag, prijs_getoond_hoog: g.bedrag };
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
  /** null = geen bedrag vooraf ("Prijs na opname"); telt niet mee in de som. 0 = inbegrepen. */
  bedrag: number | null;
}

export function extraOpties(bron: Prijsbron): ExtraOptie[] {
  return [
    { key: "demontage", label: "Oude keuken demonteren en afvoeren", kort: "Oude keuken eruit", sub: "Inclusief container", bedrag: bron.demontage },
    {
      key: "apparaten",
      label: "Apparaten aansluiten",
      kort: "Apparaten aansluiten",
      sub: bron.inbegrepen.apparaten ? "Oven, kookplaat, vaatwasser, koelkast. Zit al in de prijs." : "Oven, kookplaat, vaatwasser, koelkast.",
      bedrag: bron.inbegrepen.apparaten ? 0 : null,
    },
    {
      key: "spoelbak",
      label: "Spoelbak en kraan aansluiten",
      kort: "Spoelbak en kraan",
      sub: bron.inbegrepen.spoelbak ? "Op bestaande afvoer en water. Zit al in de prijs." : "Op bestaande afvoer en water.",
      bedrag: bron.inbegrepen.spoelbak ? 0 : null,
    },
    { key: "werkblad_zagen", label: "Werkblad op maat zagen", kort: "Werkblad op maat zagen", sub: "Laminaat dat ter plekke gezaagd moet worden. Voorgezaagd is inbegrepen.", bedrag: bron.werkbladZagen },
    { key: "leiding", label: "Lichte leidingaanpassing", kort: "Leidingaanpassing", sub: "Kleine aanpassing aan water of afvoer. Die prijzen we na een opname ter plekke.", bedrag: null },
  ];
}

/** "+ € 995", "Inbegrepen" of "Prijs na opname". */
export const extraLabel = (bedrag: number | null) =>
  bedrag === null ? "Prijs na opname" : bedrag > 0 ? `+ ${euro(bedrag)}` : "Inbegrepen";

const kortBedrag = (n: number) => euro(n).replace("€ ", "€");

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

/** Afmonteren en losse klussen hebben geen band in de tarieven: geen bedrag, prijs na overleg. */
export const klusHeeftBand = (klus: TypeKlus) => klus === "complete_ikea_keuken" || klus === "andere_bouwpakketkeuken";

/** Band voor de vragenroute (null zonder band), plus de extra's als bonregels. */
export function vragenIndicatie(bron: Prijsbron, inv: VragenInvoer): { getoond: Getoond | null; regels: BonRegel[] } {
  const gekozen = extraOpties(bron).filter((e) => inv.extras[e.key]);
  const extraSom = gekozen.reduce((s, e) => s + (e.bedrag ?? 0), 0);
  const regels: BonRegel[] = gekozen.map((e) => ({
    label: e.kort,
    waarde: e.bedrag === null ? "na opname" : e.bedrag > 0 ? `+${kortBedrag(e.bedrag)}` : "inbegrepen",
  }));
  if (!klusHeeftBand(inv.klus)) return { getoond: null, regels };
  const b = bron.banden[inv.grootte];
  return { getoond: { soort: "band", laag: b.laag + extraSom, hoog: b.hoog + extraSom }, regels };
}

/** De basisregel op de bon, zonder extra's ("€1.775–2.475" of "prijs volgt"). */
export function vragenBasisWaarde(bron: Prijsbron, klus: TypeKlus, grootte: Grootte): string {
  if (!klusHeeftBand(klus)) return "prijs volgt";
  const b = bron.banden[grootte];
  return `${kortBedrag(b.laag)}–${euro(b.hoog).replace("€ ", "")}`;
}

// ---------------------------------------------------------------------------
// PDF-route (asynchroon: geen lezing vóór het verzenden, dus een band)
// ---------------------------------------------------------------------------

export function ontwerpBand(bron: Prijsbron, grootte: Grootte, pakket: Pakket, demontage: boolean): Getoond {
  const b = pakket === "montageklaar" ? bron.montageklaarBanden[grootte] : bron.banden[grootte];
  const extra = demontage ? bron.demontage : 0;
  return { soort: "band", laag: b.laag + extra, hoog: b.hoog + extra };
}

// ---------------------------------------------------------------------------
// IKEA-link: Schakel 2
// ---------------------------------------------------------------------------

/** Pakketprijzen voor de link-route, of null als er geen bedrag getoond mag worden. */
export interface LinkPrijzen {
  compleet: number;
  montageklaar: number;
  werkbladZagen: number; // 0 als het werkblad voorgezaagd is of er geen is
  demontage: number;
}

/**
 * Van Schakel 2 naar wat de klant ziet. Alleen bij vertrouwen "hoog" een vaste
 * prijs: een te lage vaste prijs is erger dan geen bedrag. `toonPrijs` is
 * TOON_PRIJS_BIJ_LINK (ikea-planner/verwerker.ts), server-side doorgegeven.
 */
export function linkPrijzen(bron: Prijsbron, prijs: PrijsResultaat, werkblad: WerkbladSoort, toonPrijs: boolean): LinkPrijzen | null {
  if (!toonPrijs || prijs.vertrouwen !== "hoog") return null;
  return {
    compleet: Math.round(prijs.compleet.incl),
    montageklaar: Math.round(prijs.montageklaar.incl),
    werkbladZagen: werkblad === "laminaat_op_locatie" ? bron.werkbladZagen : 0,
    demontage: bron.demontage,
  };
}

export function linkGetoond(p: LinkPrijzen | null, pakket: Pakket, demontage: boolean): Getoond | null {
  if (!p) return null;
  return { soort: "vast", bedrag: p[pakket] + p.werkbladZagen + (demontage ? p.demontage : 0) };
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

export function kostenKaarten(bron: Prijsbron): KostenKaart[] {
  return [
    { grootte: "<8", titel: "Kleine keuken", sub: "Tot 8 kasten, rechte opstelling", band: band(bron.banden["<8"]) },
    { grootte: "8-14", titel: "Gemiddelde keuken", sub: "8 tot 14 kasten, L- of U-vorm", band: band(bron.banden["8-14"]) },
    { grootte: "15+", titel: "Grote keuken", sub: "15 kasten of meer, met kookeiland", band: band(bron.banden["15+"]) },
  ];
}

/** Losse bedragen voor lopende tekst ("ongeveer € 700 minder", "€ 995 extra"). */
export function tekstBedragen(bron: Prijsbron) {
  return {
    montageklaarScheelt: euro(bron.montageklaarScheeltOngeveer),
    demontage: euro(bron.demontage),
    werkbladZagen: euro(bron.werkbladZagen),
    klein: band(bron.banden["<8"]),
    gemiddeld: band(bron.banden["8-14"]),
    groot: band(bron.banden["15+"]),
    laagsteBand: euro(bron.banden["<8"].laag),
    hoogsteBand: euro(bron.banden["15+"].hoog),
    // "2,5 tot 5 werkdagen" (Compleet, kleinste tot grootste band)
    dagen: `${String(bron.banden["<8"].laag_dagen).replace(".", ",")} tot ${String(bron.banden["15+"].hoog_dagen).replace(".", ",")}`,
  };
}
