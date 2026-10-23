"use client";

import { useEffect, useRef, useState } from "react";
import { CONSENT_OPEN_EVENT, bewaarConsentKeuze, setConsent, type ConsentState } from "@/lib/consent";
import { useConsentKeuze } from "@/components/analytics/useConsentKeuze";

/** CSS-variabele op <html> met de hoogte van de balk, zolang die zichtbaar is. */
export const CONSENT_BAR_HOOGTE_VAR = "--consent-bar-h";

/**
 * Cookiebalk: smalle vaste strook onderaan, geen overlay, geen scroll-lock.
 * GA4 en Google Ads staan default op 'denied' (Consent Mode v2, Analytics.tsx);
 * Accepteren zet alle vier de signalen op 'granted' — ook ad_user_data en
 * ad_personalization, want de keuze reist mee met een offerteaanvraag en
 * bepaalt of gehashte contactgegevens naar Google Ads mogen (enhanced
 * conversions, docs/ADS-CONVERSIES.md). De eigen attributiecookie
 * (AttributieCapture) wacht eveneens op 'granted'.
 *
 * Verdwijnt na een keuze en komt alleen terug via de footerlink
 * "Cookie-instellingen". De sticky mobiele CTA-balk schuift omhoog zolang de
 * balk zichtbaar is (via --consent-bar-h). Toont niets zonder GA-config.
 */
export function ConsentBanner() {
  const keuze = useConsentKeuze();
  const [heropend, setHeropend] = useState(false);
  const balkRef = useRef<HTMLDivElement>(null);

  // Upgrade gtag op elke page-load bij een eerdere acceptatie; zonder dit
  // blijft Consent Mode op denied.
  useEffect(() => {
    if (keuze === "granted") setConsent(true);
  }, [keuze]);

  useEffect(() => {
    const heropen = () => setHeropend(true);
    window.addEventListener(CONSENT_OPEN_EVENT, heropen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, heropen);
  }, []);

  const tonen = Boolean(process.env.NEXT_PUBLIC_GA_ID) && (keuze === "geen" || heropend);

  // Hoogte van de balk doorgeven, zodat de mobiele CTA-balk en de pagina-
  // onderkant er niet onder verdwijnen.
  useEffect(() => {
    const root = document.documentElement;
    const el = balkRef.current;
    if (!tonen || !el) {
      root.style.removeProperty(CONSENT_BAR_HOOGTE_VAR);
      return;
    }
    const zet = () => root.style.setProperty(CONSENT_BAR_HOOGTE_VAR, `${el.offsetHeight}px`);
    zet();
    const ro = new ResizeObserver(zet);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty(CONSENT_BAR_HOOGTE_VAR);
    };
  }, [tonen]);

  if (!tonen) return null;

  function kies(state: ConsentState) {
    setHeropend(false);
    bewaarConsentKeuze(state);
  }

  const knop =
    "flex-1 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink sm:flex-none sm:px-4";

  return (
    <div
      ref={balkRef}
      role="region"
      aria-label="Cookie-instellingen"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-4 py-2 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <p className="min-w-0 flex-1 text-xs leading-snug text-ink-soft sm:truncate sm:text-sm">
          We gebruiken cookies voor advertentiemeting en delen daarvoor gegevens met Google.{" "}
          <a href="/privacy#cookies" className="whitespace-nowrap underline hover:text-ink">
            Meer info
          </a>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => kies("granted")} className={knop}>
            Accepteren
          </button>
          <button type="button" onClick={() => kies("denied")} className={knop}>
            Weigeren
          </button>
        </div>
      </div>
    </div>
  );
}
