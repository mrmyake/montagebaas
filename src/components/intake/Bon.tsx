import type { Bon as BonModel } from "@/lib/intake/bon";

/** De kassabon rechts op desktop (mockup: Plex Mono, stippellijnen, gekartelde onderrand). */
export function Bon({ bon, merknaam, telefoon }: { bon: BonModel; merknaam: string; telefoon: string }) {
  return (
    <aside aria-label="Jouw prijs" className="sticky top-6 hidden min-w-[280px] flex-[0_1_380px] lg:block">
      <div className="bg-white px-6 pb-5 pt-[26px] font-mono text-[14px] leading-[1.55] shadow-[0_18px_40px_-24px_rgba(21,23,26,0.45)]">
        <p className="m-0 text-center text-[15px] font-semibold uppercase tracking-[0.08em]">{merknaam}</p>
        <p className="mt-0.5 text-center text-v2-muted">Montage IKEA-keuken</p>
        <div className="mb-3 mt-4 border-t-2 border-dashed border-v2-line-strong" />
        <div aria-live="polite">
          {bon.leeg ? (
            <p className="my-3 text-center text-v2-muted">{bon.leeg}</p>
          ) : (
            <>
              {bon.regels.map((r) => (
                <div key={r.label} className="flex items-baseline gap-2 py-[3px]">
                  <span className="flex-[0_1_auto]">{r.label}</span>
                  <span aria-hidden="true" className="flex-[1_1_20px] -translate-y-1 border-b border-dotted border-[#9AA09A]" />
                  <span className="flex-none text-right font-semibold">{r.waarde}</span>
                </div>
              ))}
              <div className="mb-2.5 mt-3 border-t-2 border-dashed border-v2-line-strong" />
              <p className="m-0 text-v2-muted">{bon.prijsLabel}</p>
              <p className="mt-0.5 font-sans text-[clamp(26px,2.6vw,34px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-merk">
                {bon.prijsTekst}
              </p>
              {bon.altTekst && <p className="mt-1.5 text-v2-muted">{bon.altTekst}</p>}
              <p className="mt-2 text-v2-muted">Incl. btw en reiskosten. Je vaste prijs volgt binnen 24 uur.</p>
            </>
          )}
        </div>
        <div className="mb-3 mt-4 border-t-2 border-dashed border-v2-line-strong" />
        <p className="m-0 text-center text-v2-muted">Vragen? Bel {telefoon}</p>
      </div>
      <div
        aria-hidden="true"
        className="h-2.5"
        style={{
          background:
            "linear-gradient(135deg, #FFFFFF 50%, transparent 50%) 0 0 / 14px 10px repeat-x, linear-gradient(225deg, #FFFFFF 50%, transparent 50%) 0 0 / 14px 10px repeat-x",
        }}
      />
    </aside>
  );
}
