"use client";

import { useActionState } from "react";
import { addAdvertentiekosten } from "./actions";

export function AdvertentiekostenForm() {
  const [result, formAction, pending] = useActionState(addAdvertentiekosten, {});

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded border border-[var(--color-line)] bg-white p-4">
      <label className="flex flex-col text-sm text-[var(--color-ink-soft)]">
        Maand
        <input type="month" name="maand" required className="mt-1 rounded border border-[var(--color-line-strong)] px-2 py-1" />
      </label>

      <label className="flex flex-col text-sm text-[var(--color-ink-soft)]">
        Kanaal
        <input
          type="text"
          name="kanaal"
          placeholder="google_ads / werkspot"
          required
          className="mt-1 rounded border border-[var(--color-line-strong)] px-2 py-1"
        />
      </label>

      <label className="flex flex-col text-sm text-[var(--color-ink-soft)]">
        Campagne
        <input type="text" name="campagne" placeholder="optioneel" className="mt-1 rounded border border-[var(--color-line-strong)] px-2 py-1" />
      </label>

      <label className="flex flex-col text-sm text-[var(--color-ink-soft)]">
        Kosten (excl. BTW)
        <input
          type="number"
          step="0.01"
          min="0"
          name="kosten"
          required
          className="mt-1 w-32 rounded border border-[var(--color-line-strong)] px-2 py-1"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
      >
        {pending ? "Opslaan…" : "Toevoegen"}
      </button>

      {result?.error && <span className="text-sm text-red-600">{result.error}</span>}
    </form>
  );
}
