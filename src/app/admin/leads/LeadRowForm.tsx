"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { updateLead } from "./actions";
import { LEAD_STATUSSEN, LEAD_STATUSSEN_MET_FACTUUR, type LeadStatus } from "@/lib/db.types";

// Wachttijd na de laatste toetsaanslag voordat tekst- en bedragvelden opslaan.
const AUTOSAVE_VERTRAGING_MS = 800;

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
  const [result, dispatch, pending] = useActionState(updateLead.bind(null, aanvraagId), {});
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [heeftWijziging, setHeeftWijziging] = useState(false);

  // Bewust geen <form action>: React reset dan na elke save de ongecontroleerde
  // velden, wat tekst wist die je tijdens het opslaan nog aan het typen bent.
  // Opeenvolgende dispatches worden door useActionState op volgorde afgehandeld.
  function verstuur() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    setHeeftWijziging(false);
    startTransition(() => dispatch(formData));
  }

  function planOpslaan(vertragingMs: number) {
    setHeeftWijziging(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(verstuur, vertragingMs);
  }

  // Bij het verlaten van een veld direct (synchroon) opslaan, zodat een klik op
  // een link of filter meteen na het typen de wijziging niet laat verdwijnen.
  function opslaanBijVerlaten() {
    if (timerRef.current) verstuur();
  }

  let melding: React.ReactNode = null;
  if (pending || heeftWijziging) melding = <span className="text-sm text-[var(--color-muted)]">Opslaan…</span>;
  else if (result?.error) melding = <span className="text-sm text-red-600">{result.error}</span>;
  else if (result?.opgeslagen) melding = <span className="text-sm text-green-700">Opgeslagen ✓</span>;

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        verstuur();
      }}
      onInput={(e) => {
        if (e.target instanceof HTMLSelectElement) return; // select slaat via onChange direct op
        planOpslaan(AUTOSAVE_VERTRAGING_MS);
      }}
      onBlur={opslaanBijVerlaten}
      className="flex flex-wrap items-center gap-2"
    >
      <select
        name="lead_status"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value as LeadStatus);
          // Timeout 0: pas na de re-render opslaan, zodat het factuurveld al
          // (on)beschikbaar is gemaakt voor de nieuwe status.
          planOpslaan(0);
        }}
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

      {melding}
    </form>
  );
}
