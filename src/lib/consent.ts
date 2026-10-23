// Google Consent Mode v2 helper. De default-staat (alles 'denied') wordt vóór
// gtag.js gezet in Analytics.tsx; deze functie upgradet/downgradet die staat
// zodra de bezoeker in de ConsentBanner een keuze maakt.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const CONSENT_STORAGE_KEY = "montagebaas_consent";
export type ConsentState = "granted" | "denied";

export function setConsent(granted: boolean): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const v: ConsentState = granted ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: v,
    analytics_storage: v,
    ad_user_data: v,
    ad_personalization: v,
  });
}

/**
 * De opgeslagen bannerkeuze, voor het meesturen met een offerteaanvraag.
 * null = nog geen keuze (banner open, GA niet geconfigureerd, of opslag
 * onbereikbaar). De server zet dit om naar consent_ad_user_data /
 * consent_ad_personalization op de aanvraag.
 */
export function huidigeConsentKeuze(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

/** Vertaalt de bannerkeuze naar de twee consent-kolommen op `aanvragen`. */
export function consentVoorInsert(keuze: unknown): {
  consent_ad_user_data: boolean | null;
  consent_ad_personalization: boolean | null;
} {
  const v = keuze === "granted" ? true : keuze === "denied" ? false : null;
  return { consent_ad_user_data: v, consent_ad_personalization: v };
}
