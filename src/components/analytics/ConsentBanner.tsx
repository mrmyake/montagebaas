"use client";

import { useEffect, useState } from "react";
import { setConsent, CONSENT_STORAGE_KEY, type ConsentState } from "@/lib/consent";

/**
 * AVG-cookiebanner. GA4 staat default op 'denied' (Consent Mode v2, zie
 * Analytics.tsx); deze banner upgradet naar 'granted' bij accepteren. Toont
 * niets als GA4 niet geconfigureerd is of de bezoeker al gekozen heeft.
 */
export function ConsentBanner() {
  const [decision, setDecision] = useState<ConsentState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GA_ID) return;
    try {
      const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored === "granted") {
        // Upgrade gtag op elke page-load; zonder dit blijft Consent Mode op denied.
        setConsent(true);
        setDecision("granted");
      } else if (stored === "denied") {
        setDecision("denied");
      } else {
        setReady(true); // nog geen keuze → toon banner
      }
    } catch {
      setReady(true);
    }
  }, []);

  if (!ready || decision !== null) return null;

  function persist(state: ConsentState) {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, state);
    } catch {
      // private mode — banner komt na reload toch niet meer terug binnen sessie
    }
    setConsent(state === "granted");
    setDecision(state);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie-toestemming"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-paper shadow-card lg:bottom-0"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:py-5">
        <p className="flex-1 text-sm leading-relaxed text-ink-soft">
          We gebruiken cookies om het siteverkeer te meten. Door op
          &lsquo;Accepteren&rsquo; te klikken ga je akkoord met analytics-cookies.
          Zie onze{" "}
          <a href="/privacy" className="text-accent underline">
            privacyverklaring
          </a>
          .
        </p>
        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => persist("denied")}
            className="flex-1 rounded-xl border border-line-strong px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink sm:flex-none"
          >
            Weigeren
          </button>
          <button
            type="button"
            onClick={() => persist("granted")}
            className="flex-1 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-cta transition-colors hover:bg-accent-hover sm:flex-none"
          >
            Accepteren
          </button>
        </div>
      </div>
    </div>
  );
}
