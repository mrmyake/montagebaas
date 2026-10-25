import { Star } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { ReviewCard } from "@/components/sections/ReviewCard";
import {
  HOMEPAGE_TESTIMONIALS,
  REVIEW_AGGREGATES,
  REVIEW_SAMENVATTING,
  cijfer,
} from "@/lib/testimonials";

/**
 * Reviews-sectie voor home + stadspagina's. Toont de vaste homepage-selectie uit
 * docs/design/montagebaas-reviews.md (A2, A3, B1; nooit A1), met bron per quote.
 * `compact` blijft voor de bestaande aanroepen; de selectie is altijd dezelfde drie.
 */
export function Reviews(props: { compact?: boolean }) {
  void props;
  const items = HOMEPAGE_TESTIMONIALS;

  return (
    <Section className="bg-surface">
      <SectionHeading eyebrow="Klantervaringen" titel="Reviews" center />

      {/* Aggregaat — de échte profiel-scores */}
      <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-4 text-sm sm:gap-6">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <Star size={16} className="fill-accent text-accent" />
          {REVIEW_SAMENVATTING}
        </span>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {items.map((t, i) => (
          <ReviewCard key={i} {...t} />
        ))}
      </div>

      <div className="mt-10 text-center">
        <ButtonLink href="/reviews" variant="secondary">
          Lees meer reviews
        </ButtonLink>
        <p className="mt-3 text-xs text-muted">
          <a href={REVIEW_AGGREGATES.google.profileUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
            Google {cijfer(REVIEW_AGGREGATES.google.rating)} uit {REVIEW_AGGREGATES.google.count}
          </a>
          {" · "}
          <a href={REVIEW_AGGREGATES.werkspot.profileUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
            Werkspot {cijfer(REVIEW_AGGREGATES.werkspot.rating)} uit {REVIEW_AGGREGATES.werkspot.count}
          </a>
        </p>
      </div>
    </Section>
  );
}
