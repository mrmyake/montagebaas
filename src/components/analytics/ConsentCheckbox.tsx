"use client";

import { useConsentKeuze } from "@/components/analytics/useConsentKeuze";

/**
 * Checkbox in het offerteformulier voor wie de cookiebalk negeerde; alleen
 * zichtbaar zolang er nog geen keuze is. Vooraf aangevinkt. Bij verzenden
 * geldt aangevinkt als accepteren en uitgevinkt als weigeren (zelfde update
 * als de bannerknoppen, via bewaarConsentKeuze), met consent_bron 'formulier'.
 */
export function ConsentCheckbox({
  checked,
  onChange,
  className = "",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  const keuze = useConsentKeuze();
  if (keuze !== "geen") return null;
  return (
    <label className={`flex cursor-pointer items-center gap-3 text-base text-ink ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-line-strong accent-[var(--color-accent)]"
      />
      <span>Google mag meten via welke advertentie je ons vond.</span>
    </label>
  );
}
