/**
 * Foutcategorieën voor het uitlezen van een planner-link. PUUR.
 *
 * - ongeldige_link: geen herkenbare planner-UUID (wij vangen dit af, geen request)
 * - niet_gevonden: IKEA kent het ontwerp niet (404 / BM_201): niet opgeslagen,
 *   niet gedeeld of verwijderd
 * - ikea_fout: elke andere HTTP-fout van IKEA (token-keten gewijzigd, 403/429/5xx)
 * - timeout: geen antwoord binnen de tijdslimiet (ook na de retry)
 * - onverwachte_structuur: antwoord kwam, maar niet in de vorm die de mapping kent
 */
export type PlannerFoutCategorie =
  | "ongeldige_link"
  | "niet_gevonden"
  | "ikea_fout"
  | "timeout"
  | "onverwachte_structuur";

export const PLANNER_FOUT_CATEGORIEEN: PlannerFoutCategorie[] = [
  "ongeldige_link",
  "niet_gevonden",
  "ikea_fout",
  "timeout",
  "onverwachte_structuur",
];

/** Uitleg per categorie voor de notificatie aan Ilja (nooit naar de klant). */
export const PLANNER_FOUT_UITLEG: Record<PlannerFoutCategorie, string> = {
  ongeldige_link: "geen herkenbare IKEA planner-link",
  niet_gevonden: "IKEA kent dit ontwerp niet (404/BM_201): niet opgeslagen, niet gedeeld of verwijderd",
  ikea_fout: "IKEA gaf een foutmelding; mogelijk is de token-keten of API gewijzigd",
  timeout: "IKEA reageerde niet binnen 8 s, ook niet na één retry",
  onverwachte_structuur: "het antwoord van IKEA had een onbekende vorm; de mapping is niet te vertrouwen",
};

export class PlannerFout extends Error {
  categorie: PlannerFoutCategorie;
  constructor(categorie: PlannerFoutCategorie, bericht: string) {
    super(bericht);
    this.name = "PlannerFout";
    this.categorie = categorie;
  }
}

/** Zet een mislukt HTTP-antwoord om in een PlannerFout. `wat` = welke stap (voor de log). */
export function classificeerHttp(status: number, body: string, wat: string): PlannerFout {
  const kort = body.slice(0, 200);
  if (status === 404 || /BM_201/.test(body)) {
    return new PlannerFout("niet_gevonden", `${wat} ${status}: ${kort}`);
  }
  return new PlannerFout("ikea_fout", `${wat} ${status}: ${kort}`);
}

/**
 * Mag een mislukte call één keer opnieuw? Alleen bij een 5xx: een 429 of 403
 * betekent dat IKEA ons afremt of weigert, dan juist niet nog eens aankloppen.
 */
export const isTijdelijkeStatus = (status: number) => status >= 500;

/** Willekeurige fout → PlannerFout; bestaande PlannerFouten blijven zoals ze zijn. */
export function naarPlannerFout(e: unknown): PlannerFout {
  if (e instanceof PlannerFout) return e;
  const bericht = e instanceof Error ? e.message : String(e);
  return new PlannerFout("ikea_fout", bericht);
}
