"use client";

import { useEffect } from "react";
import {
  ATTRIBUTIE_COOKIE,
  BEWAARTERMIJN_DAGEN,
  volgendeCookieWaarde,
} from "@/lib/attributie";
import { CONSENT_CHANGED_EVENT, CONSENT_STORAGE_KEY, type ConsentState } from "@/lib/consent";

/**
 * Legt vast waar de bezoeker vandaan komt (gclid + utm's) in een eigen
 * first-party cookie — maar ALLEEN na accepteren van de cookiebanner.
 *
 * Twee momenten:
 *  1. bij mount, als de bezoeker eerder al accepteerde (keuze in localStorage);
 *  2. zodra de bezoeker in de banner op Accepteren klikt (window-event), zolang
 *     de attributieparameters dan nog in de URL staan.
 * Bij 'denied' wordt een eventueel aanwezige cookie verwijderd. Zonder keuze
 * gebeurt er niets. De server controleert dit nogmaals (attributieVoorInsertMetConsent).
 *
 * Draait los van gtag.js en werkt dus ook bij geblokkeerde Google-scripts;
 * dat was de reden voor de eigen cookie. Staat in de root layout, dus dit mount
 * één keer per volledige paginalading.
 */
export function AttributieCapture() {
  useEffect(() => {
    function legVast() {
      try {
        const waarde = volgendeCookieWaarde(window.location.href, document.referrer);
        // null = deze URL bevat geen attributieparameters. Niets doen, zodat een
        // direct bezoek de herkomst van een eerdere advertentieklik niet wist.
        if (waarde === null) return;
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie =
          `${ATTRIBUTIE_COOKIE}=${encodeURIComponent(waarde)}` +
          `; path=/; max-age=${BEWAARTERMIJN_DAGEN * 24 * 60 * 60}; SameSite=Lax${secure}`;
      } catch {
        // Attributie mag nooit een pagina breken.
      }
    }

    function verwijder() {
      try {
        document.cookie = `${ATTRIBUTIE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      } catch {
        // idem
      }
    }

    function pasToe(keuze: ConsentState | null) {
      if (keuze === "granted") legVast();
      else if (keuze === "denied") verwijder();
    }

    let opgeslagen: string | null = null;
    try {
      opgeslagen = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch {
      opgeslagen = null;
    }
    pasToe(opgeslagen === "granted" || opgeslagen === "denied" ? opgeslagen : null);

    const bijKeuze = (e: Event) => pasToe((e as CustomEvent<ConsentState>).detail ?? null);
    window.addEventListener(CONSENT_CHANGED_EVENT, bijKeuze);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, bijKeuze);
  }, []);

  return null;
}
