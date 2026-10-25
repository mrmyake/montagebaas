import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Tekstlogo van de oude site (v1). Sterk, simpel woordmerk met een accent-merkteken.
 * "Montagebaas" krijgt het tweekleurige woordmerk, een ander merk zijn naam.
 */
export function Logo({ naam, className }: { naam: string; className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${naam} — naar home`}
      className={cn("group inline-flex items-center gap-2", className)}
    >
      {/* Merkteken: winkelhaak/level-vorm als verwijzing naar vakmanschap */}
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-[8px] bg-ink text-white transition-colors group-hover:bg-accent"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4v16h16" />
          <path d="m9 15 3-3 3 3" />
        </svg>
      </span>
      <span className="font-display text-xl font-bold tracking-tight text-ink">
        {naam === "Montagebaas" ? (
          <>
            Montage<span className="text-accent">baas</span>
          </>
        ) : (
          naam
        )}
      </span>
    </Link>
  );
}
