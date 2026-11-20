/**
 * De opgeslagen stuklijst (`appData.bom` uit metadata/2) lezen. PUUR.
 *
 * Structuur (zie spikes/ikea-planner/VERKENNING.md): `products[]` met geneste
 * `children[]`/`packs[]`, plus `linears[]` (werkblad, plint), `packs[]` en
 * `decos[]`. Artikelregels zijn de GEPRIJSDE `ART-`/`EXT-`nodes; ASL/ASM/SCP/MSC
 * zijn structuur of materiaal. Aantal = `quantity` (afwezig = 1); bij maatwerk
 * `linear` (m) of `square` (m²). Ongeprijsde voorkantranden van maatwerkbladen
 * staan ook niet op de IKEA-lijst en tellen niet mee.
 */
import { PlannerFout } from "./fouten.ts";
import { naarArtikelnummer, type ProductInfo } from "./product.ts";

// BOM-nodes zijn ongetypeerde JSON uit een ongedocumenteerde API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BomNode = any;

export interface BomRegel {
  dbId: string;
  aantal: number;
  prijs: number | null;
  methode: string | null;
  bron: string; // products | linears | packs | decos (+ '.packs')
  node: BomNode;
}

const SECTIES = ["products", "linears", "packs", "decos"] as const;

/**
 * Leest `appData.bom` uit een metadata/2-antwoord en controleert de structuur.
 * Gooit `onverwachte_structuur` als de vorm niet meer klopt — dat is het signaal
 * dat IKEA iets veranderd heeft en de mapping niet meer te vertrouwen is.
 */
export function leesBom(metadata: unknown): { bom: BomNode; bomRuw: string; overgeslagen: Overgeslagen[] } {
  const appData = (metadata as BomNode)?.appData;
  const bomRuw = appData?.bom;
  if (typeof bomRuw !== "string") {
    throw new PlannerFout("onverwachte_structuur", "metadata/2: appData.bom ontbreekt of is geen string");
  }
  let bom: BomNode;
  try {
    bom = JSON.parse(bomRuw);
  } catch {
    throw new PlannerFout("onverwachte_structuur", "appData.bom is geen geldige JSON");
  }
  if (!bom || typeof bom !== "object" || !Array.isArray(bom.products)) {
    throw new PlannerFout("onverwachte_structuur", "appData.bom heeft geen products[]");
  }
  // Prijs is optioneel (IKEA levert soms tijdelijk geen prijzen): alleen helemaal
  // geen ART-regels is een onverwachte structuur.
  if (!bomRegels(bom).some((r) => r.dbId.startsWith("ART-"))) {
    throw new PlannerFout("onverwachte_structuur", "appData.bom bevat geen ART-regels");
  }
  const overgeslagen = overgeslagenRegels(bom);
  if (overgeslagen.length) {
    console.warn(`[planner] ${overgeslagen.length} ongeprijsde regel(s) overgeslagen: ${overgeslagen.map((o) => `${o.dbID} (${o.reden})`).join("; ")}`);
  }
  return { bom, bomRuw, overgeslagen };
}

/** Alle ART-/EXT-regels uit de BOM, geprijsd of niet. */
export function bomRegels(bom: BomNode): BomRegel[] {
  const regels: BomRegel[] = [];
  const loop = (n: BomNode, bron: string) => {
    if (Array.isArray(n)) return n.forEach((x) => loop(x, bron));
    if (!n || typeof n !== "object") return;
    if (typeof n.dbID === "string" && /^(ART|EXT)-/.test(n.dbID)) {
      const cur = n.price?.current;
      const methode: string | null = cur?.additionalData?.pricingMethod ?? null;
      const aantal =
        methode === "linearMeter" ? n.linear : methode === "squareMeter" ? n.square : (n.quantity ?? 1);
      regels.push({
        dbId: n.dbID,
        aantal: typeof aantal === "number" ? aantal : 0,
        prijs: typeof cur?.value === "number" ? cur.value : null,
        methode,
        bron,
        node: n,
      });
    }
    for (const [k, v] of Object.entries(n)) {
      if (k === "children" || k === "packs") loop(v, k === "packs" ? `${bron}.packs` : bron);
    }
  };
  for (const sectie of SECTIES) loop(bom?.[sectie] ?? [], sectie);
  return regels;
}

/** Regel die op stuks telt (quantity), niet op meters/m²/voorkantrand. */
const opStuks = (r: BomRegel) => r.node.linear === undefined && r.node.square === undefined && !r.node.front;

/** Landsuffix van een id: 'ART-90213573-NL' → 'NL'. */
const landVanId = (dbId: string) => /-([A-Z]{2})$/.exec(dbId)?.[1] ?? null;

/** Land van de BOM uit `locale` ('nl-NL' → 'NL'). Zonder bruikbare locale: NL, de enige markt van deze site. */
export const landVanBom = (bom: BomNode): string => {
  const land = typeof bom?.locale === "string" ? /[-_]([A-Za-z]{2})$/.exec(bom.locale)?.[1] : undefined;
  return land ? land.toUpperCase() : "NL";
};

/** Waarom een ongeprijsde regel niet meetelt (null = hij telt wel mee). */
function overslaanReden(r: BomRegel, land: string): string | null {
  if (r.prijs !== null) return null;
  if (r.dbId.startsWith("ART-") || (r.dbId.startsWith("EXT-") && opStuks(r))) {
    const l = landVanId(r.dbId);
    return l === land ? null : `ander land: ${l ?? "geen landsuffix"}, BOM is ${land}`;
  }
  return "ongeprijsd maatwerk (m/m²/voorkantrand): aantal niet te bepalen";
}

/**
 * De regels die op de IKEA-artikellijst staan. Prijs is optioneel (IKEA levert
 * soms tijdelijk geen prijzen): een geprijsde regel telt altijd mee; een
 * ongeprijsde ART-regel, of EXT-regel op stuks, telt mee op dbID en quantity
 * als zijn landsuffix bij het land van de BOM past. De rest valt af en staat in
 * `overgeslagenRegels`.
 */
export const geprijsdeRegels = (bom: BomNode) => {
  const land = landVanBom(bom);
  return bomRegels(bom).filter((r) => overslaanReden(r, land) === null);
};

export interface Overgeslagen {
  dbID: string;
  reden: string;
}

/** Ongeprijsde regels die niet meetellen, met reden, per id+reden één keer. Voor log en snapshot. */
export function overgeslagenRegels(bom: BomNode): Overgeslagen[] {
  const land = landVanBom(bom);
  const uit = new Map<string, Overgeslagen>();
  for (const r of bomRegels(bom)) {
    const reden = overslaanReden(r, land);
    if (reden) uit.set(`${r.dbId}|${reden}`, { dbID: r.dbId, reden });
  }
  return [...uit.values()];
}

/** Aantal meetellende regels zonder prijs; > 0 = telling (deels) op artikelnummers. */
export const regelsZonderPrijs = (bom: BomNode) => geprijsdeRegels(bom).filter((r) => r.prijs === null).length;

/** Ids waarvoor we productgegevens nodig hebben (stap 1: alles wat in de BOM staat). */
export const bomIds = (bom: BomNode) => [...new Set(geprijsdeRegels(bom).map((r) => r.dbId))];

/** Stap 2: ART-ids waar EXT-regels (maatwerk) naar verwijzen. */
export function referentieIds(bom: BomNode, producten: Record<string, ProductInfo>): string[] {
  const ids = geprijsdeRegels(bom)
    .filter((r) => r.dbId.startsWith("EXT-"))
    .map((r) => producten[r.dbId]?.referentie)
    .filter((x): x is string => !!x && x.startsWith("ART-") && !producten[x]);
  return [...new Set(ids)];
}

export interface Prijscontrole {
  som: number;
  totaal: number | null;
  verschil: number | null;
}

/** Som van prijs × aantal tegen `totalPrice.current`. In de spike 10/10 exact. */
export function prijscontrole(bom: BomNode): Prijscontrole {
  let som = 0;
  for (const r of geprijsdeRegels(bom)) som += (r.prijs ?? 0) * r.aantal;
  som = Math.round(som * 100) / 100;
  const totaal = typeof bom?.totalPrice?.current === "number" ? bom.totalPrice.current : null;
  // Met regels zonder prijs klopt de som niet en valt er niets te vergelijken.
  const volledig = regelsZonderPrijs(bom) === 0;
  return { som, totaal, verschil: totaal === null || !volledig ? null : Math.round((som - totaal) * 100) / 100 };
}

export interface Artikel {
  dbId: string; // het ART-id waaronder het op de lijst staat
  artikelnummer: string; // '405.917.03'
  naam: string;
  omschrijving: string; // 'onderkast, zwartgrijs, 60x60x80 cm'
  soort: string; // 'onderkast' (eerste deel van de omschrijving, kleine letters)
  aantal: number;
  leverbaar: boolean | null;
}

/**
 * De artikellijst zoals op de IKEA-PDF: per ART-nummer opgeteld. EXT-regels
 * (maatwerkblad, -rand, spoelbak voor maatwerk) verwijzen via `referentie` naar
 * hun ART-nummer; naam/omschrijving komen dan van het EXT-product, omdat dat
 * ART-nummer niet als los product in de catalogus staat.
 */
export function artikelenUitBom(bom: BomNode, producten: Record<string, ProductInfo>): Artikel[] {
  const aantallen = new Map<string, number>();
  const bronInfo = new Map<string, ProductInfo | undefined>();
  for (const r of geprijsdeRegels(bom)) {
    const ext = r.dbId.startsWith("EXT-") ? producten[r.dbId] : undefined;
    const id = ext ? ext.referentie : r.dbId;
    if (!id || !id.startsWith("ART-")) {
      throw new PlannerFout("onverwachte_structuur", `geen artikelnummer voor ${r.dbId}`);
    }
    aantallen.set(id, Math.round(((aantallen.get(id) ?? 0) + r.aantal) * 100) / 100);
    const eigen = producten[id];
    bronInfo.set(id, eigen?.naam ? eigen : (ext ?? eigen));
  }
  return [...aantallen]
    .map(([id, aantal]) => {
      const p = bronInfo.get(id);
      const omschrijving = [p?.omschrijving, p?.maat].filter(Boolean).join(", ");
      return {
        dbId: id,
        artikelnummer: naarArtikelnummer(id) ?? id,
        naam: p?.naam ?? "",
        omschrijving,
        soort: soortVan(p?.omschrijving ?? ""),
        aantal,
        leverbaar: p?.leverbaar ?? null,
      };
    })
    .sort((a, b) => a.artikelnummer.localeCompare(b.artikelnummer));
}

/**
 * Ids van de posities: de ASL-assemblages direct onder `products[]`. Hun
 * productnaam zegt waarvoor de positie bedoeld is ("Vaatwasser met 2
 * ladefronten", "Hoge kast voor oven met planken"), ook als het apparaat zelf
 * niet besteld is.
 */
export const positieIds = (bom: BomNode): string[] => [
  ...new Set<string>(
    (bom?.products ?? []).map((p: BomNode) => p?.dbID).filter((id: unknown): id is string => typeof id === "string" && id.startsWith("ASL-"))
  ),
];

export interface Positie {
  dbId: string;
  uuid: string | null; // koppelt aan de plaatsing in de opstelling (opstelling.ts)
  naam: string | null; // 'vaatwasser met 2 ladefronten' (kleine letters), null = geen productgegevens
  soorten: string[]; // soorten van de geprijsde artikelen in deze positie
}

/** Per ASL-positie: de naam en welke soorten artikelen erin zitten. */
export function posities(bom: BomNode, producten: Record<string, ProductInfo>): Positie[] {
  return (bom?.products ?? [])
    .filter((p: BomNode) => typeof p?.dbID === "string" && p.dbID.startsWith("ASL-"))
    .map((p: BomNode) => {
      const soorten = new Set<string>();
      for (const r of geprijsdeRegels({ products: [p] })) {
        const ext = r.dbId.startsWith("EXT-") ? producten[r.dbId] : undefined;
        const id = ext?.referentie ?? r.dbId;
        const info = producten[id]?.naam ? producten[id] : (ext ?? producten[id]);
        if (info?.omschrijving) soorten.add(soortVan(info.omschrijving));
      }
      const naam = producten[p.dbID]?.omschrijving?.toLowerCase() || null;
      return { dbId: p.dbID, uuid: typeof p.uuid === "string" ? p.uuid : null, naam, soorten: [...soorten] };
    });
}

/** 'onderkast, zwartgrijs' → 'onderkast' */
export const soortVan = (omschrijving: string) => omschrijving.split(",")[0].trim().toLowerCase();

