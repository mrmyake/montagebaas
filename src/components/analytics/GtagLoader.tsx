"use client";

import { useEffect } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const SCRIPT_SRC = GA_ID
  ? `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  : null;

// Idle-fallback: 8s — ruim buiten Lighthouse's TBT-meetvenster, zodat het
// gtag.js-script de initial-load metrics niet raakt. Engaged users triggeren
// al binnen 1-2s via interactie; bouncers via visibilitychange-hidden.
const IDLE_FALLBACK_MS = 8000;

/**
 * Laadt gtag.js lui — op de eerste van: user-interactie (pointer/scroll/touch/
 * key), tab-verbergen (mobile bouncers), of 8s idle-fallback. De inline
 * consent-shim in Analytics.tsx queue't intussen alle gtag()-calls in
 * window.dataLayer, dus page_view + consent-updates gaan niet verloren.
 */
export function GtagLoader() {
  useEffect(() => {
    if (!SCRIPT_SRC) return;
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;

    let loaded = false;
    const interactionEvents = ["pointerdown", "touchstart", "scroll", "keydown"] as const;

    const load = () => {
      if (loaded) return;
      loaded = true;
      cleanup();
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      document.head.appendChild(s);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") load();
    };

    const opts: AddEventListenerOptions = { passive: true, once: true };
    for (const evt of interactionEvents) {
      window.addEventListener(evt, load, opts);
    }
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setTimeout(load, IDLE_FALLBACK_MS);

    function cleanup() {
      for (const evt of interactionEvents) {
        window.removeEventListener(evt, load);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(timer);
    }

    return cleanup;
  }, []);

  return null;
}
