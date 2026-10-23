"use client";

import { openConsentBanner } from "@/lib/consent";

/** Footerlink die de cookiebanner opnieuw opent, zodat een keuze te herzien is. */
export function CookieInstellingenLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentBanner} className={className}>
      Cookie-instellingen
    </button>
  );
}
