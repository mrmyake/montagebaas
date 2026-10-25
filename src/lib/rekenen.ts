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
  // Uittrekbare kastinrichting, carrousel/inrichting hoekkast, afvalsortering (aantal).
  // Nog geen minuten in de tarieven: weegt dus 0 tot dat bepaald is.
  binneninrichting: number;
  // Kookeiland of vrijstaand blok in het ontwerp (0/1). Ook nog zonder minuten: weegt 0.
  eiland: number;

  aannames: string[]; // elk twijfelpunt letterlijk
  vertrouwen: "hoog" | "gemiddeld" | "laag"; // stuurt mens-in-de-lus
}

/** De 27 numerieke telvelden (de _meter-velden mogen 1 decimaal hebben). */
export const TELVELDEN: readonly (keyof KeukenTelling)[] = [
  "onderkasten", "bovenkasten", "hoge_kasten", "lade_elementen", "zijwanden",
  "plint_meter", "lichtlijst_meter", "werkblad_meter", "uitsparing_spoelbak",
  "uitsparing_kookplaat", "koppeling", "spatwand_meter", "spoelbak_kraan",
  "vaatwasser", "inductie", "gaskookplaat", "afzuigkap", "oven",
  "koelkast_vriezer", "magnetron", "sloop", "scheve_muren", "kraanboring",
  "afvoer_leidingwerk", "onderkast_verlichting", "binneninrichting",
  "eiland",
] as const;

const VERTROUWEN_WAARDEN = ["hoog", "gemiddeld", "laag"] as const;

export interface Tarieven {
  basis: {
    dagtarief_excl: number;
    effectieve_uren_dag: number;
    voorrij_excl: number;
    btw: number;
    // Dagenmodel (spike dagenmodel, 2026-10). Aanwezig → berekenDagenmodel, anders
    // het oorspronkelijke urenmodel (hele dagen, Montageklaar via asm-minuten).
    vaste_minuten?: number; // per klus, ongeacht de telling (apparaten, spoelbak, werkblad, afwerking)
    buffer_dagen?: number; // bovenop de geschatte echte werkdagen, max. tot de eerstvolgende hele dag
    minimum_dagen?: number; // Compleet
    montageklaar_min_dagen?: number; // Montageklaar = Compleet − dit
    prijs_eindigt_op?: number[]; // incl. btw naar boven afronden op een bedrag dat hierop eindigt
  };
  minuten: Record<string, { tijd: number; asm: number }>;
  // Losse posten incl. btw, buiten de dagen om (dagenmodel).
  toeslagen?: { sloop_incl?: number; werkblad_zagen_incl?: number };
  // Wat in de pakketprijs zit zonder eigen minuten (voor de site-teksten).
  inbegrepen?: string[];
  // Prijsband Compleet per keukengrootte (onder- + bovenkasten), voor de vragenroute
  // zonder telling. Afgeleid uit het dagenmodel.
  indicatiebanden?: Record<"klein" | "gemiddeld" | "groot", IndicatieBand>;
}

export interface IndicatieBand {
  kasten: string; // "<8" | "8-14" | "15+"
  laag: number; // incl. btw
  hoog: number;
  laag_dagen: number;
  hoog_dagen: number;
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
  // Losse posten buiten de pakketprijs (bv. sloop), incl. btw. Alleen bij het dagenmodel.
  toeslagen: { naam: string; incl: number }[];
  vertrouwen: KeukenTelling["vertrouwen"];
  aannames: string[];
}

export type ValidatieResultaat =
  | { ok: true; telling: KeukenTelling }
  | { ok: false; ontbrekend: string[] };

/**
 * Dwingt het contract af: élk van de 27 telvelden moet aanwezig zijn als eindig
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

/**
 * Alle telvelden 0: er is geen keuken herkend (bv. een lege of verkeerde
 * upload). Doorrekenen zou alleen de voorrijkosten als "prijs" opleveren.
 */
export function isLegeTelling(t: KeukenTelling): boolean {
  return TELVELDEN.every((veld) => t[veld] === 0);
}

/** Geld in centen afronden — voorkomt float-ruis en is correct voor bedragen. */
function naarCenten(bedrag: number): number {
  return Math.round(bedrag * 100) / 100;
}

/** Telling × tarief-minuten; de tarievenset bepaalt welke velden meetellen. */
function telMinuten(t: KeukenTelling, tar: Tarieven): { totaal: number; assembly: number } {
  let totaal = 0;
  let assembly = 0;
  for (const key of Object.keys(tar.minuten)) {
    const aantal = (t as unknown as Record<string, unknown>)[key];
    if (typeof aantal !== "number") continue;
    totaal += aantal * tar.minuten[key].tijd;
    assembly += aantal * tar.minuten[key].asm;
  }
  return { totaal, assembly };
}

/** Naar boven op het eerstvolgende bedrag dat eindigt op een van `eindes` (bv. 25/75/95). */
export function rondPrijsAf(bedrag: number, eindes: number[]): number {
  const gesorteerd = [...eindes].sort((a, b) => a - b);
  const honderd = Math.floor(bedrag / 100) * 100;
  for (const e of gesorteerd) if (honderd + e >= bedrag - 1e-9) return honderd + e;
  return honderd + 100 + gesorteerd[0];
}

/**
 * Van geschatte echte werkdagen naar offertedagen: buffer erbij, naar boven op een
 * halve dag, maar nooit verder dan de eerstvolgende hele dag; met een minimum.
 * 3,0 → 3,5 · 3,3 → 4 · 3,6 → 4 (afgetopt) · 2,2 → 3.
 */
export function offerteDagen(echteDagen: number, buffer: number, minimum: number): number {
  const metBuffer = Math.ceil((echteDagen + buffer) * 2 - 1e-9) / 2;
  return Math.max(minimum, Math.min(metBuffer, Math.floor(echteDagen) + 1));
}

/**
 * Dagenmodel: vaste minuten per klus + minuten per telveld → echte werkdagen →
 * offertedagen (buffer, afronding) → prijs, afgerond op een bedrag eindigend op
 * 25/75/95. Montageklaar = Compleet − een vast aantal dagen.
 */
function berekenDagenmodel(t: KeukenTelling, tar: Tarieven): PrijsResultaat {
  const b = tar.basis;
  const minPerDag = b.effectieve_uren_dag * 60;
  const totaal = (b.vaste_minuten ?? 0) + telMinuten(t, tar).totaal;
  const dagenCompleet = offerteDagen(totaal / minPerDag, b.buffer_dagen ?? 0, b.minimum_dagen ?? 0);
  const verschil = b.montageklaar_min_dagen ?? 1;
  const eindes = b.prijs_eindigt_op ?? [25, 75, 95];

  const pakket = (dagen: number): PakketPrijs => {
    const incl = rondPrijsAf((dagen * b.dagtarief_excl + b.voorrij_excl) * (1 + b.btw), eindes);
    const excl = naarCenten(incl / (1 + b.btw));
    return { dagen, excl, btw: naarCenten(incl - excl), incl };
  };
  const compleet = pakket(dagenCompleet);
  const montageklaar = pakket(dagenCompleet - verschil);
  const sloop = tar.toeslagen?.sloop_incl;
  return {
    totaal_minuten: totaal,
    assembly_minuten: verschil * minPerDag,
    compleet,
    montageklaar,
    besparing_incl: naarCenten(compleet.incl - montageklaar.incl),
    toeslagen: t.sloop > 0 && sloop ? [{ naam: "sloop oude keuken", incl: sloop }] : [],
    vertrouwen: t.vertrouwen,
    aannames: t.aannames,
  };
}

/**
 * PUUR. Geen import van tarieven, geen DB-call. Itereert over de tarief-minuten
 * (de bron bepaalt welke velden meetellen) en leest de bijbehorende aantallen.
 * Tarieven met `basis.vaste_minuten` rekenen met het dagenmodel.
 */
export function berekenPrijsUitTelling(t: KeukenTelling, tar: Tarieven): PrijsResultaat {
  if (tar.basis.vaste_minuten !== undefined) return berekenDagenmodel(t, tar);
  const { totaal, assembly } = telMinuten(t, tar);

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
    toeslagen: [],
    vertrouwen: t.vertrouwen,
    aannames: t.aannames,
  };
}
