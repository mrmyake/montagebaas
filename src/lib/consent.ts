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
