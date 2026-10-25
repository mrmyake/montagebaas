"use client";

import type { ReactNode } from "react";

/** Gedeelde stijl van een keuzekaart (mockup: 2px rand, 10px radius, teal bij gekozen). */
const kaart = (aan: boolean) =>
  `text-left font-[inherit] text-v2-ink rounded-[10px] border-2 cursor-pointer min-h-11 ${
    aan ? "bg-v2-soft border-merk" : "bg-white border-v2-line hover:border-v2-line-strong"
  }`;

function Rondje({ aan }: { aan: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 h-5 w-5 flex-none rounded-full border-2 shadow-[inset_0_0_0_3px_#fff] ${aan ? "border-merk bg-merk" : "border-v2-line bg-white"}`}
    />
  );
}

export function Vinkje({ aan }: { aan: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[5px] border-2 ${aan ? "border-merk bg-merk" : "border-v2-line bg-white"}`}
    >
      {aan && (
        <svg width="13" height="13" viewBox="0 0 14 14">
          <path d="M3 7.5l2.5 2.5L11 4.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/** Eén keuze uit een groep (radio-gedrag via aria-pressed, zoals de mockup). */
export function KeuzeKaart({
  aan,
  onKies,
  label,
  sub,
  compact = false,
}: {
  aan: boolean;
  onKies: () => void;
  label: string;
  sub?: string;
  /** Mobiel: alleen het label, gecentreerd (opstelling, periode). */
  compact?: boolean;
}) {
  return (
    <button type="button" aria-pressed={aan} onClick={onKies} className={`${kaart(aan)} flex items-start gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5`}>
      {/* Mobiele mockup: kaarten zonder bolletje */}
      <span className="hidden flex-none sm:block">
        <Rondje aan={aan} />
      </span>
      <span className="min-w-0">
        <span className="block font-bold">{label}</span>
        {sub && <span className={`block text-[13.5px] text-v2-muted sm:text-[14.5px] ${compact ? "hidden sm:block" : ""}`}>{sub}</span>}
      </span>
    </button>
  );
}

export function VinkKaart({
  aan,
  onWissel,
  label,
  sub,
  rechts,
}: {
  aan: boolean;
  onWissel: () => void;
  label: string;
  sub?: string;
  rechts?: string;
}) {
  return (
    <button type="button" aria-pressed={aan} onClick={onWissel} className={`${kaart(aan)} flex w-full items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3`}>
      <Vinkje aan={aan} />
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{label}</span>
        {sub && <span className="block text-[13.5px] text-v2-muted sm:text-[14.5px]">{sub}</span>}
      </span>
      {rechts && <span className="whitespace-nowrap font-mono text-[13.5px] font-semibold sm:text-[14.5px]">{rechts}</span>}
    </button>
  );
}

export function PakketKaart({
  aan,
  onKies,
  label,
  sub,
  prijs,
}: {
  aan: boolean;
  onKies: () => void;
  label: string;
  sub: string;
  prijs: string | null;
}) {
  return (
    <button type="button" aria-pressed={aan} onClick={onKies} className={`${kaart(aan)} flex flex-col gap-1 px-3.5 py-3 sm:p-4`}>
      <span className="flex items-baseline justify-between gap-2.5">
        <span className="text-[17px] font-extrabold sm:text-[18px]">{label}</span>
        {prijs && <span className="text-[18px] font-extrabold text-merk sm:text-[20px]">{prijs}</span>}
      </span>
      <span className="text-[13.5px] text-v2-muted sm:text-[14.5px]">{sub}</span>
    </button>
  );
}

export function StapKop({ id, titel, sub }: { id?: string; titel: string; sub?: string }) {
  return (
    <div className="mb-3.5">
      <h2 id={id} tabIndex={-1} className="m-0 text-[20px] font-extrabold tracking-[-0.02em] outline-none sm:text-[22px]">
        {titel}
      </h2>
      {sub && <p className="mt-1 text-[14px] text-v2-muted sm:text-[15px]">{sub}</p>}
    </div>
  );
}

export function Veld({ id, label, extra, children }: { id: string; label: string; extra?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[14px] font-bold sm:mb-1.5 sm:text-[15px]">
        {label} {extra && <span className="font-normal text-v2-muted">{extra}</span>}
      </label>
      {children}
    </div>
  );
}

export const invoerKlasse =
  "w-full min-h-12 rounded-lg border-2 border-v2-line-strong bg-white px-3 font-[inherit] text-[16px] text-v2-ink focus:border-v2-ink focus:outline-none";

export const postcodeKlasse =
  "w-full max-w-[240px] min-h-[54px] rounded-lg border-2 border-v2-ink bg-white px-3.5 font-mono text-[20px] tracking-[0.06em] text-v2-ink";

export function Melding({ children, soort = "info" }: { children: ReactNode; soort?: "info" | "fout" }) {
  return (
    <div
      role={soort === "fout" ? "alert" : undefined}
      className={`rounded-[10px] px-4 py-3 text-[14.5px] ${soort === "fout" ? "bg-[#FBEAE7] text-[#8A2414]" : "bg-v2-soft text-v2-chip"}`}
    >
      {children}
    </div>
  );
}
