"use client";

import { useEffect } from "react";

/**
 * Vuurt het conversie-event af op de bedankpagina (de KPI: voltooide offerteaanvraag).
 *
 * Event-naam = exact `offerte_aanvraag` (in GA4 als key event gemarkeerd en
 * geïmporteerd als Google Ads-conversie). Eén tag/gtag voor zowel GA4 als AW —
 * Consent Mode v2 bepaalt of het volledig of geaggregeerd/modeled doorkomt.
 *
 * Vuurt ALLEEN na een echte verzending: de Configurator zet `OFFERTE_VERZONDEN_KEY`
 * in sessionStorage vóór de redirect; hier lezen we die één keer uit en wissen 'm.
 * Zo telt een directe bezoeker/bot op /bedankt niet mee, en tellen refresh/terugknop
 * niet dubbel.
 */
export const OFFERTE_VERZONDEN_KEY = "mb_offerte_verzonden";
// Welke route de aanvraag nam (formulier/link/pdf/foto), als parameter op het event.
export const INVOERMETHODE_KEY = "mb_invoermethode";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function ConversionTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let verzonden = false;
    let invoermethode: string | null = null;
    try {
      verzonden = window.sessionStorage.getItem(OFFERTE_VERZONDEN_KEY) === "1";
      invoermethode = window.sessionStorage.getItem(INVOERMETHODE_KEY);
      // Direct wissen → refresh/terugknop vuurt niet opnieuw.
      if (verzonden) window.sessionStorage.removeItem(OFFERTE_VERZONDEN_KEY);
      window.sessionStorage.removeItem(INVOERMETHODE_KEY);
    } catch {
      return; // sessionStorage onbereikbaar (private mode) → niets afvuren
    }
    if (!verzonden) return;

    // window.gtag is de consent-shim (queue't in dataLayer) tot gtag.js laadt;
    // het event gaat dus niet verloren als de library nog lui aan het laden is.
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "offerte_aanvraag", invoermethode ? { invoermethode } : {});
  }, []);

  return null;
}
