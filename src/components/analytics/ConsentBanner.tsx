"use client";

import { useEffect, useState } from "react";
import { setConsent, CONSENT_STORAGE_KEY, type ConsentState } from "@/lib/consent";

/**
 * AVG-cookiebanner. GA4 en Google Ads staan default op 'denied' (Consent Mode
 * v2, zie Analytics.tsx); deze banner upgradet alle vier de signalen naar
 * 'granted' bij accepteren — inclusief ad_user_data en ad_personalization,
 * omdat de keuze ook meereist met een offerteaanvraag en bepaalt of gehashte
 * contactgegevens naar Google Ads mogen (enhanced conversions for leads, zie
 * docs/ADS-CONVERSIES.md). De tekst moet dat dus benoemen. Toont niets als
 * GA4 niet geconfigureerd is of de bezoeker al gekozen heeft.
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
          We gebruiken cookies om het siteverkeer te meten en om te zien welke
          Google-advertenties tot een aanvraag leiden. Klik je op
          &lsquo;Accepteren&rsquo;, dan delen we gegevens over je bezoek met Google
          voor advertentiemeting en gepersonaliseerde advertenties. Vraag je een
          offerte aan, dan geven we ook een versleutelde (gehashte) versie van je
          e-mailadres en telefoonnummer aan Google door, zodat we kunnen meten
          welke advertentie tot een opdracht leidde. Weiger je, dan meten en delen
          we niets. Zie onze{" "}
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
