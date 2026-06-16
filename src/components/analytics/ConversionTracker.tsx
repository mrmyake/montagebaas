"use client";

import { useEffect } from "react";

/**
 * Vuurt een conversie-event af op de bedankpagina (de KPI: voltooide offerteaanvraag).
 * Werkt met GA4 (generate_lead) en optioneel Google Ads (NEXT_PUBLIC_ADS_CONVERSION_LABEL).
 * Doet niets als er geen gtag is geladen.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function ConversionTracker() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;

    // GA4 lead-event
    window.gtag("event", "generate_lead", {
      event_category: "offerte",
      event_label: "offerteaanvraag voltooid",
    });

    // Optioneel: Google Ads conversie
    const adsLabel = process.env.NEXT_PUBLIC_ADS_CONVERSION_LABEL;
    if (adsLabel) {
      window.gtag("event", "conversion", { send_to: adsLabel });
    }
  }, []);

  return null;
}
