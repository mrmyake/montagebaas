"use client";

import { useEffect } from "react";

/**
 * Stuurt een realtime ntfy-push (via /api/ntfy-cta) zodra een bezoeker op een
 * bel-, WhatsApp- of e-mail-link klikt — ook als 'ie het formulier niet invult.
 *
 * Eén gedelegeerde click-listener op document i.p.v. een handler per knop: zo
 * werkt het automatisch voor zowel server-rendered (Footer) als client-links
 * (Header) zonder elke CTA aan te raken. We gebruiken navigator.sendBeacon zodat
 * het verzoek de page-unload van een tel:-/mailto:-link overleeft.
 */

type CtaType = "phone" | "whatsapp" | "email";

function classify(href: string): CtaType | null {
  if (href.startsWith("tel:")) return "phone";
  if (href.startsWith("mailto:")) return "email";
  if (href.includes("wa.me") || href.includes("api.whatsapp.com")) return "whatsapp";
  return null;
}

export function CtaClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";
      const type = classify(href);
      if (!type) return;

      const location = window.location.pathname.replace(/^\/$/, "home").replace(/^\//, "");
      const payload = JSON.stringify({ type, location: location || "home" });

      try {
        const blob = new Blob([payload], { type: "application/json" });
        if (!navigator.sendBeacon?.("/api/ntfy-cta", blob)) {
          // Fallback als sendBeacon niet beschikbaar is / weigert.
          fetch("/api/ntfy-cta", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Tracking mag nooit de klik blokkeren.
      }
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
