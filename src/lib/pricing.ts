/**
 * Prijslogica voor de configurator.
 *
 * ⚠️ EIGENAAR: deze bedragen zijn een werkbare MARKTSCHATTING (IKEA-montage ligt globaal
 * tussen €1.100–€2.500). KALIBREER met je echte kostprijzen VÓÓR LIVEGANG. Een range die
 * structureel naast de uiteindelijke offerte zit, kost vertrouwen.
 *
 * Output is ALTIJD een range (puntschatting ± margePct), afgerond op €50.
 */

export type Grootte = "<8" | "8-15" | "15+";
export type Opstelling = "recht" | "hoek" | "eiland";
export type ExtraKey =
  | "demontage_afvoer"
  | "apparaat_aansluiten"
  | "werkblad_monteren"
  | "spoelbak_kraan"
  | "lichte_leidingaanpassing";

export const pricing = {
  basis: {
    // basis montagebedrag per grootteklasse (puntschatting in €)
    "<8": 1250,
    "8-15": 1650,
    "15+": 2300,
  } satisfies Record<Grootte, number>,

  opstellingToeslag: {
    recht: 0,
    hoek: 150,
    eiland: 300,
  } satisfies Record<Opstelling, number>,

  extras: {
    demontage_afvoer: 350, // oude keuken eruit + afvoeren
    apparaat_aansluiten: 75, // per stuk (× aantal)
    werkblad_monteren: 200, // standaard werkblad
    spoelbak_kraan: 95,
    lichte_leidingaanpassing: 125, // per punt
    // tegelwerk/spatwand => "op aanvraag", niet in som
  } satisfies Record<ExtraKey, number>,

  margePct: 0.15, // ± marge voor de getoonde range
} as const;

export type Extras = {
  demontage_afvoer?: boolean;
  apparaat_aansluiten?: boolean;
  apparaat_aantal?: number;
  werkblad_monteren?: boolean;
  spoelbak_kraan?: boolean;
  lichte_leidingaanpassing?: boolean;
};

export interface PrijsInput {
  grootte: Grootte;
  opstelling: Opstelling;
  extras: Extras;
}

export interface PrijsRange {
  punt: number;
  min: number;
  max: number;
}

const rondAf50 = (n: number) => Math.round(n / 50) * 50;

/** Som van de gekozen extra's (inclusief aantal-stepper voor apparaten). */
export function extrasSom(extras: Extras): number {
  let som = 0;
  if (extras.demontage_afvoer) som += pricing.extras.demontage_afvoer;
  if (extras.apparaat_aansluiten) {
    const aantal = Math.max(1, extras.apparaat_aantal ?? 1);
    som += pricing.extras.apparaat_aansluiten * aantal;
  }
  if (extras.werkblad_monteren) som += pricing.extras.werkblad_monteren;
  if (extras.spoelbak_kraan) som += pricing.extras.spoelbak_kraan;
  if (extras.lichte_leidingaanpassing) som += pricing.extras.lichte_leidingaanpassing;
  return som;
}

/** Bereken de prijsrange. Output altijd afgerond op €50. */
export function berekenPrijs({ grootte, opstelling, extras }: PrijsInput): PrijsRange {
  const punt =
    pricing.basis[grootte] +
    pricing.opstellingToeslag[opstelling] +
    extrasSom(extras);

  return {
    punt,
    min: rondAf50(punt * (1 - pricing.margePct)),
    max: rondAf50(punt * (1 + pricing.margePct)),
  };
}

export const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
