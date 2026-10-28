/**
 * Schakel 2 voor /admin/offerte: de ongewijzigde rekenmodule (rekenen.ts) plus de
 * losse toeslagen uit dezelfde tarievenrij, en de controle op het pakketverschil.
 * PUUR: geen bedragen in de code, alles komt uit de meegegeven tarieven.
 */
import {
  berekenPrijsUitTelling,
  rondPrijsAf,
  steenbladBuitenScope,
  type KeukenTelling,
  type PrijsResultaat,
  type Tarieven,
} from "../rekenen.ts";
import type { WerkbladSoort } from "../ikea-planner/telling.ts";

export type WerkbladKeuze = "automatisch" | "laminaat_voorgezaagd" | "laminaat_zagen" | "steen";

export const WERKBLAD_KEUZES: { waarde: WerkbladKeuze; label: string }[] = [
  { waarde: "automatisch", label: "Automatisch (uit het ontwerp)" },
  { waarde: "laminaat_voorgezaagd", label: "Laminaat, voorgezaagd" },
  { waarde: "laminaat_zagen", label: "Laminaat, zagen op locatie" },
  { waarde: "steen", label: "Steen, composiet of porselein" },
];

const KEUZE_NAAR_SOORT: Record<Exclude<WerkbladKeuze, "automatisch">, WerkbladSoort> = {
  laminaat_voorgezaagd: "maatwerk_laminaat",
  laminaat_zagen: "laminaat_op_locatie",
  steen: "steen",
};

export function effectiefWerkblad(gedetecteerd: WerkbladSoort, keuze: WerkbladKeuze): WerkbladSoort {
  return keuze === "automatisch" ? gedetecteerd : KEUZE_NAAR_SOORT[keuze];
}

/**
 * Past de werkbladkeuze toe op de telling, met dezelfde regels als
 * ikea-planner/telling.ts: steen → buiten scope, voorgezaagd → geen uitsparingen.
 */
export function tellingMetWerkblad(t: KeukenTelling, werkblad: WerkbladSoort): KeukenTelling {
  if (werkblad === "steen") return steenbladBuitenScope(t);
  if (werkblad === "maatwerk_laminaat") return { ...t, uitsparing_spoelbak: 0, uitsparing_kookplaat: 0 };
  return t;
}

export interface Toeslag {
  sleutel: "werkblad_zagen_incl" | "sloop_incl";
  naam: string;
  incl: number;
}

export interface OffertePrijs {
  compleet: number; // incl. btw, incl. toeslagen, afgerond op 25/75/95
  montageklaar: number;
  dagen: { compleet: number; montageklaar: number }; // alleen intern
  basis: PrijsResultaat; // de ongewijzigde schakel 2-uitkomst
  toeslagen: Toeslag[];
  verschil: number;
  dagprijsIncl: number;
  verschilBinnenMarge: boolean;
}

/** Pakketverschil moet binnen 0,8–1,2 × één dagtarief (incl. btw) liggen, grenzen inbegrepen. */
export const VERSCHIL_MARGE = { min: 0.8, max: 1.2 } as const;

export function berekenOffertePrijs(
  telling: KeukenTelling,
  tarieven: Tarieven,
  opties: { werkblad: WerkbladSoort; oudeKeuken: boolean }
): OffertePrijs {
  const basis = berekenPrijsUitTelling(tellingMetWerkblad(telling, opties.werkblad), tarieven);
  const t = tarieven.toeslagen ?? {};
  const toeslagen: Toeslag[] = [];
  const voegToe = (sleutel: Toeslag["sleutel"], naam: string) => {
    const incl = t[sleutel];
    if (typeof incl !== "number") throw new Error(`Toeslag ${sleutel} ontbreekt in de actieve tarievenrij`);
    toeslagen.push({ sleutel, naam, incl });
  };
  if (opties.werkblad === "laminaat_op_locatie") voegToe("werkblad_zagen_incl", "laminaat werkblad zagen op locatie");
  if (opties.oudeKeuken) voegToe("sloop_incl", "oude keuken verwijderen");

  const eindes = tarieven.basis.prijs_eindigt_op ?? [25, 75, 95];
  const extra = toeslagen.reduce((s, x) => s + x.incl, 0);
  const compleet = rondPrijsAf(basis.compleet.incl + extra, eindes);
  const montageklaar = rondPrijsAf(basis.montageklaar.incl + extra, eindes);
  const dagprijsIncl = Math.round(tarieven.basis.dagtarief_excl * (1 + tarieven.basis.btw) * 100) / 100;
  const verschil = compleet - montageklaar;
  const ratio = verschil / dagprijsIncl;

  return {
    compleet,
    montageklaar,
    dagen: { compleet: basis.compleet.dagen, montageklaar: basis.montageklaar.dagen },
    basis,
    toeslagen,
    verschil,
    dagprijsIncl,
    verschilBinnenMarge: ratio >= VERSCHIL_MARGE.min - 1e-9 && ratio <= VERSCHIL_MARGE.max + 1e-9,
  };
}
