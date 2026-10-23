"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_OPEN_EVENT,
  CONSENT_STORAGE_KEY,
  meldConsentGewijzigd,
  setConsent,
  type ConsentState,
} from "@/lib/consent";

// De opgeslagen keuze als externe store: localStorage + het consent-event.
// Zo hoeft er geen setState in een effect (en geen hydration-mismatch: op de
// server en tijdens hydratie geldt "onbekend", pas daarna de echte waarde).
type Opgeslagen = ConsentState | "geen" | "onbekend";

function abonneer(cb: () => void) {
  window.addEventListener(CONSENT_CHANGED_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function leesOpgeslagen(): Opgeslagen {
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : "geen";
  } catch {
    return "geen"; // private mode → banner tonen, net als zonder keuze
  }
}

const serverSnapshot = (): Opgeslagen => "onbekend";

/**
 * AVG-cookiebanner. GA4 en Google Ads staan default op 'denied' (Consent Mode
 * v2, zie Analytics.tsx); deze banner upgradet alle vier de signalen naar
 * 'granted' bij accepteren — inclusief ad_user_data en ad_personalization,
 * omdat de keuze ook meereist met een offerteaanvraag en bepaalt of gehashte
 * contactgegevens naar Google Ads mogen (enhanced conversions for leads, zie
 * docs/ADS-CONVERSIES.md). Ook de eigen attributiecookie (AttributieCapture)
 * wacht op 'granted'. De keuze wordt als window-event gemeld, en de banner
 * gaat opnieuw open via de footerlink "Cookie-instellingen".
 *
 * Toont niets als GA4 niet geconfigureerd is of de bezoeker al gekozen heeft.
 */
export function ConsentBanner() {
  const opgeslagen = useSyncExternalStore(abonneer, leesOpgeslagen, serverSnapshot);
  const [heropend, setHeropend] = useState(false);

  // Upgrade gtag op elke page-load bij een eerdere acceptatie; zonder dit
  // blijft Consent Mode op denied.
  useEffect(() => {
    if (opgeslagen === "granted") setConsent(true);
  }, [opgeslagen]);

  // Footerlink "Cookie-instellingen": banner opnieuw tonen, keuze mag opnieuw.
  useEffect(() => {
    const heropen = () => setHeropend(true);
    window.addEventListener(CONSENT_OPEN_EVENT, heropen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, heropen);
  }, []);

  if (!process.env.NEXT_PUBLIC_GA_ID) return null;
  const tonen = opgeslagen === "geen" || heropend;
  if (!tonen) return null;

  function persist(state: ConsentState) {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, state);
    } catch {
      // private mode — banner komt na reload toch niet meer terug binnen sessie
    }
    setConsent(state === "granted");
    setHeropend(false);
    meldConsentGewijzigd(state); // → store-snapshot ververst, AttributieCapture reageert
  }

  const knop =
    "flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors sm:flex-none";

  return (
    <div
      role="dialog"
      aria-label="Cookie-toestemming"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-paper shadow-card lg:bottom-0"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:py-5">
        <p className="flex-1 text-sm leading-relaxed text-ink-soft">
          We gebruiken cookies voor advertentiemeting en delen daarvoor gegevens met Google.{" "}
          <a href="/privacy#cookies" className="text-accent underline">
            Meer info
          </a>
        </p>
        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => persist("denied")}
            className={`${knop} bg-accent text-white shadow-cta hover:bg-accent-hover`}
          >
            Weigeren
          </button>
          <button
            type="button"
            onClick={() => persist("granted")}
            className={`${knop} bg-accent text-white shadow-cta hover:bg-accent-hover`}
          >
            Accepteren
          </button>
        </div>
      </div>
    </div>
  );
}
