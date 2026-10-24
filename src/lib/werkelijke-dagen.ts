/**
 * Werkelijk gewerkte dagen per klus (0015): de grondwaarheid voor het
 * dagenmodel. PUUR: invoercontrole voor /admin/leads en de tekst van de
 * wekelijkse herinnering voor uitgevoerde klussen zonder dagen.
 */

export const MAX_WERKELIJKE_DAGEN = 30;

export type WerkelijkeDagenInvoer = { ok: true; waarde: number | null } | { ok: false; fout: string };

/** "3,5" of "3.5" → 3.5; leeg → null. Alleen halve dagen, groter dan 0, hooguit 30. */
export function parseWerkelijkeDagen(raw: string | null | undefined): WerkelijkeDagenInvoer {
  const tekst = (raw ?? "").trim();
  if (tekst === "") return { ok: true, waarde: null };
  const waarde = Number(tekst.replace(",", "."));
  if (!Number.isFinite(waarde) || waarde <= 0 || waarde > MAX_WERKELIJKE_DAGEN) {
    return { ok: false, fout: `Werkelijke dagen moet tussen 0,5 en ${MAX_WERKELIJKE_DAGEN} liggen.` };
  }
  if (!Number.isInteger(waarde * 2)) {
    return { ok: false, fout: "Werkelijke dagen in halve dagen, bijvoorbeeld 3 of 3,5." };
  }
  return { ok: true, waarde };
}

export interface KlusZonderDagen {
  naam: string;
  uitgevoerd_sinds: string; // lead_status_gewijzigd_op (ISO)
  offerte_bedrag: number | null;
  gefactureerd_bedrag: number | null;
}

const datum = (iso: string) =>
  new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" });
const euro = (n: number) => `€ ${Math.round(n).toLocaleString("nl-NL")}`;

/** Onderwerp en tekst van de wekelijkse herinnering. Oudste klus bovenaan. */
export function herinneringTekst(klussen: KlusZonderDagen[], adminUrl: string): { subject: string; text: string } {
  const regels = [...klussen]
    .sort((a, b) => a.uitgevoerd_sinds.localeCompare(b.uitgevoerd_sinds))
    .map((k) => {
      const bedrag = k.gefactureerd_bedrag ?? k.offerte_bedrag;
      return `- ${k.naam}, uitgevoerd ${datum(k.uitgevoerd_sinds)}${bedrag ? `, ${euro(bedrag)}` : ""}`;
    });
  const n = klussen.length;
  return {
    subject: `Werkelijke dagen invullen: ${n} ${n === 1 ? "klus" : "klussen"}`,
    text: [
      `Bij ${n === 1 ? "deze uitgevoerde klus" : `deze ${n} uitgevoerde klussen`} staat nog geen aantal werkelijk gewerkte dagen:`,
      "",
      ...regels,
      "",
      "Vul ze in (in halve dagen) bij Leads, filter op Uitgevoerd:",
      `${adminUrl}/admin/leads?status=uitgevoerd`,
      "",
      "Deze dagen zijn de grondwaarheid voor het dagenmodel: zonder kunnen we niet zien of de offertes boven of onder het echte werk zitten.",
    ].join("\n"),
  };
}
