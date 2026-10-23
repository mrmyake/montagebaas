import { useSyncExternalStore } from "react";
import { CONSENT_CHANGED_EVENT, CONSENT_STORAGE_KEY, type ConsentState } from "@/lib/consent";

/**
 * De opgeslagen bannerkeuze als externe store (localStorage + consent-event).
 * "onbekend" op de server en tijdens hydratie, daarna "granted" | "denied" | "geen".
 * Geen setState in effects nodig, geen hydration-mismatch.
 */
export type ConsentKeuze = ConsentState | "geen" | "onbekend";

function abonneer(cb: () => void) {
  window.addEventListener(CONSENT_CHANGED_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function lees(): ConsentKeuze {
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : "geen";
  } catch {
    return "geen"; // private mode → alsof er nog geen keuze is
  }
}

const serverSnapshot = (): ConsentKeuze => "onbekend";

export function useConsentKeuze(): ConsentKeuze {
  return useSyncExternalStore(abonneer, lees, serverSnapshot);
}
