import { huidigeConsentKeuze } from "@/lib/consent";

/**
 * Trechter-events van de intake naar GA4, via dezelfde window.gtag als
 * ConversionTracker. Alleen na consent ('granted'); zonder keuze of bij
 * weigeren gaat er niets weg. Nooit persoonsgegevens: alleen keuzes en stappen.
 */

export type TrechterEvent =
  | { naam: "route_gekozen"; params: { route: string } }
  | { naam: "ontwerp_gelezen"; params: { route: string; gelukt: boolean; vertrouwen: string } }
  | { naam: "intake_stap"; params: { route: string; stap: number; stapnaam: string } }
  | { naam: "overstap_naar_vragen"; params: { van_route: string; reden: string } };

export function stuurTrechterEvent(e: TrechterEvent): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (huidigeConsentKeuze() !== "granted") return;
  window.gtag("event", e.naam, e.params);
}

/** intake_stap één keer per route en stap per sessie. */
export function stuurStapEenmalig(route: string, stap: number, stapnaam: string): void {
  const sleutel = `mb_intake_stap:${route}:${stap}`;
  try {
    if (window.sessionStorage.getItem(sleutel)) return;
    if (huidigeConsentKeuze() !== "granted") return; // pas markeren als hij ook echt verstuurd kan worden
    window.sessionStorage.setItem(sleutel, "1");
  } catch {
    // sessionStorage onbereikbaar: dan niet dedupliceren is erger dan niet meten
    return;
  }
  stuurTrechterEvent({ naam: "intake_stap", params: { route, stap, stapnaam } });
}
