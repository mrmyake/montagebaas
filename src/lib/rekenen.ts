/**
 * Schakel 2 — rekenmodule (schema-contract v2).
 *
 * PUUR: deze module importeert geen tarieven en doet geen DB-/netwerkcall.
 * `berekenPrijsUitTelling` krijgt de tarievenset als argument, zodat de logica
 * stabiel testbaar is (zie rekenen.test.ts) terwijl de live waarden in Supabase
 * leven (zie tarieven.ts → laadTarieven).
 */

export interface KeukenTelling {
  onderkasten: number;
  bovenkasten: number;
  hoge_kasten: number;
  lade_elementen: number;
  zijwanden: number;
  plint_meter: number;
  lichtlijst_meter: number;
  werkblad_meter: number;
  uitsparing_spoelbak: number;
  uitsparing_kookplaat: number;
  koppeling: number;
  spatwand_meter: number;
  spoelbak_kraan: number;
  vaatwasser: number;
  inductie: number;
  gaskookplaat: number;
  afzuigkap: number;
  oven: number;
  koelkast_vriezer: number;
  magnetron: number;
  sloop: number;
  scheve_muren: number;
  kraanboring: number;
  afvoer_leidingwerk: number;
  onderkast_verlichting: number;

  aannames: string[]; // elk twijfelpunt letterlijk
  vertrouwen: "hoog" | "gemiddeld" | "laag"; // stuurt mens-in-de-lus
}

/** De 25 numerieke telvelden (de _meter-velden mogen 1 decimaal hebben). */
export const TELVELDEN: readonly (keyof KeukenTelling)[] = [
  "onderkasten", "bovenkasten", "hoge_kasten", "lade_elementen", "zijwanden",
  "plint_meter", "lichtlijst_meter", "werkblad_meter", "uitsparing_spoelbak",
  "uitsparing_kookplaat", "koppeling", "spatwand_meter", "spoelbak_kraan",
  "vaatwasser", "inductie", "gaskookplaat", "afzuigkap", "oven",
  "koelkast_vriezer", "magnetron", "sloop", "scheve_muren", "kraanboring",
  "afvoer_leidingwerk", "onderkast_verlichting",
] as const;

const VERTROUWEN_WAARDEN = ["hoog", "gemiddeld", "laag"] as const;

export interface Tarieven {
  basis: { dagtarief_excl: number; effectieve_uren_dag: number; voorrij_excl: number; btw: number };
  minuten: Record<string, { tijd: number; asm: number }>;
}

export interface PakketPrijs {
  dagen: number;
  excl: number;
  btw: number;
  incl: number;
}

export interface PrijsResultaat {
  totaal_minuten: number;
  assembly_minuten: number;
  compleet: PakketPrijs;
  montageklaar: PakketPrijs;
  besparing_incl: number;
  vertrouwen: KeukenTelling["vertrouwen"];
  aannames: string[];
}

export type ValidatieResultaat =
  | { ok: true; telling: KeukenTelling }
  | { ok: false; ontbrekend: string[] };

/**
 * Dwingt het contract af: élk van de 25 telvelden moet aanwezig zijn als eindig
 * getal, plus de twee metavelden. Een ontbrekend veld → niet doorrekenen (een
 * stil-als-0 gelezen veld geeft een te lage "vaste" prijs). Geeft de lijst met
 * problemen terug zodat de aanvraag naar de wachtrij kan.
 */
export function valideerTelling(input: unknown): ValidatieResultaat {
  const ontbrekend: string[] = [];
  const obj = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;

  for (const veld of TELVELDEN) {
    const v = obj[veld];
    if (typeof v !== "number" || !Number.isFinite(v)) ontbrekend.push(veld);
  }
  if (!Array.isArray(obj.aannames) || !obj.aannames.every((a) => typeof a === "string")) {
    ontbrekend.push("aannames");
  }
  if (!VERTROUWEN_WAARDEN.includes(obj.vertrouwen as (typeof VERTROUWEN_WAARDEN)[number])) {
    ontbrekend.push("vertrouwen");
  }

  if (ontbrekend.length) return { ok: false, ontbrekend };
  return { ok: true, telling: obj as unknown as KeukenTelling };
}

/** Geld in centen afronden — voorkomt float-ruis en is correct voor bedragen. */
function naarCenten(bedrag: number): number {
  return Math.round(bedrag * 100) / 100;
}

/**
 * PUUR. Geen import van tarieven, geen DB-call. Itereert over de tarief-minuten
 * (de bron bepaalt welke velden meetellen) en leest de bijbehorende aantallen.
 */
export function berekenPrijsUitTelling(t: KeukenTelling, tar: Tarieven): PrijsResultaat {
  let totaal = 0;
  let assembly = 0;
  for (const key of Object.keys(tar.minuten)) {
    const aantal = (t as unknown as Record<string, unknown>)[key];
    if (typeof aantal !== "number") continue;
    totaal += aantal * tar.minuten[key].tijd;
    assembly += aantal * tar.minuten[key].asm;
  }

  const dagen = (min: number) => Math.ceil(min / 60 / tar.basis.effectieve_uren_dag);
  const pakket = (min: number): PakketPrijs => {
    const d = dagen(min);
    const excl = d * tar.basis.dagtarief_excl + tar.basis.voorrij_excl;
    const btw = naarCenten(excl * tar.basis.btw);
    return { dagen: d, excl, btw, incl: naarCenten(excl + btw) };
  };

  const compleet = pakket(totaal);
  const montageklaar = pakket(totaal - assembly);
  return {
    totaal_minuten: totaal,
    assembly_minuten: assembly,
    compleet,
    montageklaar,
    besparing_incl: naarCenten(compleet.incl - montageklaar.incl),
    vertrouwen: t.vertrouwen,
    aannames: t.aannames,
  };
}
