import { Star } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { ReviewCard } from "@/components/sections/ReviewCard";
import {
  TESTIMONIALS,
  REVIEW_AGGREGATES,
  TOTAL_REVIEW_COUNT,
  COMBINED_RATING,
} from "@/lib/testimonials";

/**
 * Reviews-sectie voor home + stadspagina's. Toont echte, geverifieerde reviews
 * (Werkspot + Google) van dezelfde vakman/onderneming, mét bron- en project-label
 * zodat transparant blijft dat het om timmer-/montagewerk gaat. Geen nep-data.
 */
export function Reviews({ compact = false }: { compact?: boolean }) {
  const items = compact ? TESTIMONIALS.slice(0, 3) : TESTIMONIALS.slice(0, 6);

  return (
    <Section className="bg-surface">
      <SectionHeading eyebrow="Klantervaringen" titel="Wat klanten zeggen" center />

      {/* Aggregaat — de échte profiel-scores */}
      <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-4 text-sm sm:gap-6">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <Star size={16} className="fill-accent text-accent" />
          {COMBINED_RATING.toFixed(1)} gemiddeld
        </span>
        <span className="text-muted">·</span>
        <span className="text-ink-soft">
          {TOTAL_REVIEW_COUNT} reviews op Google &amp; Werkspot
        </span>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {items.map((t, i) => (
          <ReviewCard key={i} {...t} />
        ))}
      </div>

      <div className="mt-10 text-center">
        <ButtonLink href="/reviews" variant="secondary">
          Lees alle {TOTAL_REVIEW_COUNT} reviews
        </ButtonLink>
        <p className="mt-3 text-xs text-muted">
          Beoordeeld met {REVIEW_AGGREGATES.google.rating.toFixed(1)} op Google en{" "}
          {REVIEW_AGGREGATES.werkspot.rating.toFixed(1)} op Werkspot.
        </p>
      </div>
    </Section>
  );
}
