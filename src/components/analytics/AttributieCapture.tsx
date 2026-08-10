"use client";

import { useEffect } from "react";
import {
  ATTRIBUTIE_COOKIE,
  BEWAARTERMIJN_DAGEN,
  volgendeCookieWaarde,
} from "@/lib/attributie";

/**
 * Legt bij de eerste paginaweergave vast waar de bezoeker vandaan komt
 * (gclid + utm's) in een eigen first-party cookie.
 *
 * Draait volledig los van gtag.js en de ConsentBanner: dit is géén tracking van
 * gedrag, maar het onthouden van de herkomst van de klik die tot een aanvraag
 * leidt — en het werkt daarom óók bij bezoekers die Google-scripts blokkeren.
 * Dat is precies de groep die nu in GA4 ontbreekt.
 *
 * Staat in de root layout, dus dit mount één keer per volledige paginalading.
 * Client-side navigaties (router.push van landingspagina naar /offerte) laten
 * de cookie ongemoeid — en dat hoeft ook niet: de waarde staat er al.
 */
export function AttributieCapture() {
  useEffect(() => {
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
  }, []);

  return null;
}
