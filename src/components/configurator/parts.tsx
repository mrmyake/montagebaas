"use client";

import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { euro } from "@/lib/pricing";

export function StepHeading({ stap, totaal, titel, sub }: { stap: number; totaal: number; titel: string; sub?: string }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-accent">Stap {stap} van {totaal}</p>
      <h2 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{titel}</h2>
      {sub && <p className="mt-2 text-ink-soft">{sub}</p>}
    </div>
  );
}

export function ProgressBar({ stap, totaal }: { stap: number; totaal: number }) {
  return (
    <div className="mb-8">
      <div className="h-2 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${(stap / totaal) * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Grote selecteerbare kaart (radio-gedrag). */
export function OptionCard({
  selected,
  onSelect,
  label,
  sub,
  prijsHint,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  sub?: string;
  prijsHint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border bg-surface p-4 text-left transition-all",
        selected
          ? "border-accent ring-2 ring-accent/20"
          : "border-line-strong hover:border-ink"
      )}
    >
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
          selected ? "border-accent bg-accent text-white" : "border-line-strong"
        )}
      >
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-ink">{label}</span>
        {sub && <span className="mt-0.5 block text-sm text-muted">{sub}</span>}
      </span>
      {prijsHint && <span className="shrink-0 text-sm font-semibold text-ink-soft">{prijsHint}</span>}
    </button>
  );
}

/** Checkbox-kaart voor extra's. */
export function CheckCard({
  checked,
  onToggle,
  label,
  sub,
  prijs,
  perStuk,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  sub?: string;
  prijs: number;
  perStuk?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={cn(
        "flex w-full items-start gap-4 rounded-xl border bg-surface p-4 text-left transition-all",
        checked ? "border-accent ring-2 ring-accent/20" : "border-line-strong hover:border-ink"
      )}
    >
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors",
          checked ? "border-accent bg-accent text-white" : "border-line-strong"
        )}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-ink">{label}</span>
        {sub && <span className="mt-0.5 block text-sm text-muted">{sub}</span>}
      </span>
      <span className="shrink-0 text-sm font-semibold text-ink-soft">
        +{euro(prijs)}
        {perStuk && <span className="text-muted"> /st</span>}
      </span>
    </button>
  );
}

export function Stepper({ value, onChange, min = 1, max = 12 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-line-strong bg-surface p-1.5">
      <button
        type="button"
        aria-label="Minder"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="grid h-9 w-9 place-items-center rounded-lg text-ink hover:bg-paper disabled:opacity-40"
        disabled={value <= min}
      >
        <Minus size={18} />
      </button>
      <span className="w-6 text-center font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Meer"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid h-9 w-9 place-items-center rounded-lg text-ink hover:bg-paper disabled:opacity-40"
        disabled={value >= max}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

export function Field({
  label,
  children,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optioneel)</span>}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";
