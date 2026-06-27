"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Info } from "lucide-react";
import { euro } from "@/lib/pricing";
import { whatsappUrl } from "@/lib/site";
import { WhatsappIcon } from "@/components/brand/WhatsappIcon";

/**
 * Toont op /bedankt de indicatieve prijs van het upload-pad. De tekening wordt
 * ontkoppeld gelezen (after() in de upload-route); hier pollen we de lead-status
 * tot de indicatie klaar staat. Op het formulier-pad (geen ?a=) rendert dit niets.
 *
 * Het blijft een INDICATIE; de caveat verschilt per leesvertrouwen.
 */
type Status =
  | { fase: "laden" }
  | { fase: "klaar"; min: number; max: number; ruw: boolean }
  | { fase: "geen" };

const MAX_POGINGEN = 20; // ~40s (2s interval)

export function TekeningIndicatie() {
  const id = useSearchParams().get("a");
  const [state, setState] = useState<Status>({ fase: "laden" });

  useEffect(() => {
    if (!id) {
      setState({ fase: "geen" });
      return;
    }
    let pogingen = 0;
    let gestopt = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      pogingen++;
      try {
        const res = await fetch(`/api/offerte-status?id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const d = (await res.json()) as {
          status?: string;
          prijs_min?: number | null;
          prijs_max?: number | null;
        };
        if (gestopt) return;

        if (
          (d.status === "prijs_berekend" || d.status === "prijs_indicatie") &&
          d.prijs_min &&
          d.prijs_max
        ) {
          setState({
            fase: "klaar",
            min: d.prijs_min,
            max: d.prijs_max,
            ruw: d.status === "prijs_indicatie",
          });
          return;
        }
        // Lezing mislukt / handmatige controle → geen getal tonen.
        if (d.status === "controle_tekening") {
          setState({ fase: "geen" });
          return;
        }
      } catch {
        // netwerkfout → blijf proberen tot de limiet
      }
      if (pogingen >= MAX_POGINGEN) {
        setState({ fase: "geen" });
        return;
      }
      timer = setTimeout(poll, 2000);
    };
    poll();

    return () => {
      gestopt = true;
      clearTimeout(timer);
    };
  }, [id]);

  if (!id || state.fase === "geen") return null;

  if (state.fase === "laden") {
    return (
      <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-xl bg-paper px-4 py-3 text-sm text-ink-soft ring-1 ring-line">
        <Loader2 size={16} className="animate-spin text-accent" />
        We berekenen je prijsindicatie uit je tekening…
      </div>
    );
  }

  const artikellijstWa = whatsappUrl(
    "Hoi Montagebaas, hier is mijn IKEA-artikellijst voor mijn keuken-offerte."
  );

  return (
    <div className="mx-auto mt-6 max-w-md rounded-2xl bg-accent-soft/50 px-5 py-4 text-left ring-1 ring-accent/30">
      <p className="text-sm font-medium text-ink-soft">Indicatie op basis van je tekening</p>
      <p className="mt-1 text-2xl font-bold text-ink">
        {euro(state.min)} – {euro(state.max)}
      </p>
      <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
        <Info size={14} className="mt-0.5 shrink-0" />
        {state.ruw
          ? "Ruwe indicatie — je tekening was lastig automatisch te lezen, dus de definitieve prijs kan afwijken. We nemen binnen 24 uur contact met je op."
          : "Indicatie op basis van je tekening. We nemen binnen 24 uur contact met je op voor je exacte vaste prijs."}
      </p>
      {state.ruw && (
        <a
          href={artikellijstWa}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-trust px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
        >
          <WhatsappIcon size={16} /> Sneller exact? Stuur je artikellijst
        </a>
      )}
    </div>
  );
}
