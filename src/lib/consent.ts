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

/** Wordt op `window` gedispatcht zodra de bezoeker in de banner kiest; detail = ConsentState. */
export const CONSENT_CHANGED_EVENT = "mb:consent-changed";
/** Wordt op `window` gedispatcht om de banner opnieuw te openen (footerlink "Cookie-instellingen"). */
export const CONSENT_OPEN_EVENT = "mb:consent-open";

export function meldConsentGewijzigd(state: ConsentState): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_CHANGED_EVENT, { detail: state }));
}

/**
 * Legt een keuze vast zoals de bannerknop dat doet: opslaan, Consent Mode
 * bijwerken en de rest van de pagina (banner, AttributieCapture) informeren.
 * Wordt ook gebruikt door de checkbox in het offerteformulier.
 */
export function bewaarConsentKeuze(state: ConsentState): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, state);
  } catch {
    // private mode — keuze geldt dan alleen voor deze pagina
  }
  setConsent(state === "granted");
  meldConsentGewijzigd(state);
}

export function openConsentBanner(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

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

export type ConsentBron = "banner" | "formulier";

/**
 * Vertaalt de keuze naar de consent-kolommen op `aanvragen`. `bron` zegt hoe
 * de keuze tot stand kwam (cookiebalk of checkbox in het formulier) en wordt
 * alleen vastgelegd als er daadwerkelijk een keuze is.
 */
export function consentVoorInsert(
  keuze: unknown,
  bron?: unknown
): {
  consent_ad_user_data: boolean | null;
  consent_ad_personalization: boolean | null;
  consent_bron: ConsentBron | null;
} {
  const v = keuze === "granted" ? true : keuze === "denied" ? false : null;
  const b = v === null ? null : bron === "formulier" ? "formulier" : bron === "banner" ? "banner" : null;
  return { consent_ad_user_data: v, consent_ad_personalization: v, consent_bron: b };
}
