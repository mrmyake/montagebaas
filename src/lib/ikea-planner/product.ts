/**
 * Productgegevens van IKEA/HomeByMe (`/3/products`) in onze eigen vorm. PUUR.
 */

export interface ProductInfo {
  dbId: string; // 'ART-40591703-NL' of 'EXT-42465223-NL'
  artikelnummer: string | null; // '405.917.03', null als dbId geen ART-id is
  referentie: string | null; // definition.reference + '-NL' (bij EXT: het echte ART-id)
  naam: string; // 'METOD'
  omschrijving: string; // 'onderkast, zwartgrijs'
  maat: string | null; // '60x60x80 cm'
  breedte: number | null;
  diepte: number | null;
  hoogte: number | null;
  leverbaar: boolean | null; // null = onbekend
  eindDatum: string | null; // ISO
}

/** 'ART-40591703-NL' → '405.917.03' */
export function naarArtikelnummer(dbId: string): string | null {
  const m = dbId.match(/^ART-(\d{8})-/);
  return m ? `${m[1].slice(0, 3)}.${m[1].slice(3, 6)}.${m[1].slice(6)}` : null;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * Zet één product uit het `/3/products`-antwoord om. `nu` is een parameter zodat
 * "niet meer leverbaar" testbaar is.
 */
export function productUitApi(dbId: string, ruw: unknown, nu: Date = new Date()): ProductInfo {
  const p = obj(ruw);
  const def = obj(p.definition);
  const pd = obj(obj(p.parameters).definition);
  const getal = (k: string) => {
    const v = obj(pd[k]).defaultValue;
    return typeof v === "number" ? v : null;
  };
  const eindDatum = str(def.endDate);
  const eindVoorbij = eindDatum !== null && Date.parse(eindDatum) < nu.getTime();
  const beschikbaar = typeof p.availability === "number" ? p.availability === 1 : null;
  const leverbaar = eindVoorbij ? false : beschikbaar;
  const ref = str(def.reference);
  return {
    dbId,
    artikelnummer: naarArtikelnummer(dbId),
    referentie: ref ? (ref.endsWith("-NL") ? ref : `${ref}-NL`) : null,
    naam: str(def.name) ?? "",
    omschrijving: str(def.shortDescription) ?? "",
    maat: str(obj(pd.commercialDimensions).defaultValue),
    breedte: getal("width"),
    diepte: getal("depth"),
    hoogte: getal("height"),
    leverbaar,
    eindDatum,
  };
}

/** Ingekorte productdefinitie voor de cache-kolom `ruw` (zonder 3D-modeldata en vertalingen). */
export function ingekort(ruw: unknown): Obj {
  const p = obj(ruw);
  const def = obj(p.definition);
  return {
    availability: p.availability ?? null,
    typeID: def.typeID ?? null,
    reference: def.reference ?? null,
    name: def.name ?? null,
    shortDescription: def.shortDescription ?? null,
    startDate: def.startDate ?? null,
    endDate: def.endDate ?? null,
    commercialDimensions: obj(obj(obj(p.parameters).definition).commercialDimensions).defaultValue ?? null,
  };
}
