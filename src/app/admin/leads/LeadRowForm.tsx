"use client";

import { useActionState, useState } from "react";
import { updateLead } from "./actions";
import { LEAD_STATUSSEN, LEAD_STATUSSEN_MET_FACTUUR, type LeadStatus } from "@/lib/db.types";

const STATUS_LABELS: Record<LeadStatus, string> = {
  nieuw: "Nieuw",
  contact_gelegd: "Contact gelegd",
  offerte_verstuurd: "Offerte verstuurd",
  wacht_op_klant: "Wacht op klant",
  gewonnen: "Gewonnen",
  uitgevoerd: "Uitgevoerd",
  verloren: "Verloren",
  geen_reactie: "Geen reactie",
  niet_passend: "Niet passend",
};

export function LeadRowForm({
  aanvraagId,
  initieleStatus,
  initieelOfferteBedrag,
  initieelGefactureerdBedrag,
  initieleRedenVerloren,
  initieleNotitie,
}: {
  aanvraagId: string;
  initieleStatus: LeadStatus;
  initieelOfferteBedrag: number | null;
  initieelGefactureerdBedrag: number | null;
  initieleRedenVerloren: string | null;
  initieleNotitie: string | null;
}) {
  const [status, setStatus] = useState<LeadStatus>(initieleStatus);
  const magFactuur = LEAD_STATUSSEN_MET_FACTUUR.includes(status);
  const [result, formAction, pending] = useActionState(updateLead.bind(null, aanvraagId), {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <select
        name="lead_status"
        value={status}
        onChange={(e) => setStatus(e.target.value as LeadStatus)}
        className="rounded border border-[var(--color-line-strong)] bg-white px-2 py-1 text-sm"
      >
        {LEAD_STATUSSEN.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <input
        type="number"
        step="0.01"
        min="0"
        name="offerte_bedrag"
        placeholder="Offerte €"
        defaultValue={initieelOfferteBedrag ?? ""}
        className="w-28 rounded border border-[var(--color-line-strong)] px-2 py-1 text-sm"
      />

      <input
        type="number"
        step="0.01"
        min="0"
        name="gefactureerd_bedrag"
        placeholder="Gefactureerd €"
        disabled={!magFactuur}
        defaultValue={magFactuur ? (initieelGefactureerdBedrag ?? "") : ""}
        title={magFactuur ? undefined : "Alleen bij status Gewonnen of Uitgevoerd"}
        className="w-32 rounded border border-[var(--color-line-strong)] px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-[var(--color-paper)] disabled:text-[var(--color-muted)]"
      />

      <input
        type="text"
        name="reden_verloren"
        placeholder="Reden verloren"
        defaultValue={initieleRedenVerloren ?? ""}
        className="w-40 rounded border border-[var(--color-line-strong)] px-2 py-1 text-sm"
      />

      <textarea
        name="notitie"
        placeholder="Notitie"
        rows={1}
        defaultValue={initieleNotitie ?? ""}
        className="w-full rounded border border-[var(--color-line-strong)] px-2 py-1 text-sm"
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[var(--color-accent)] px-3 py-1 text-sm text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
      >
        {pending ? "Opslaan…" : "Opslaan"}
      </button>

      {result?.error && <span className="text-sm text-red-600">{result.error}</span>}
    </form>
  );
}
