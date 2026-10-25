import type { Metadata } from "next";
import { Star, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ReviewCard } from "@/components/sections/ReviewCard";
import { SlotCta } from "@/components/sections/SlotCta";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  localBusinessSchema,
  aggregateRating,
  review,
  breadcrumbSchema,
} from "@/lib/schema";
import {
  TESTIMONIALS,
  REVIEW_AGGREGATES,
  TOTAL_REVIEW_COUNT,
  COMBINED_RATING,
  REVIEW_SAMENVATTING,
  cijfer,
} from "@/lib/testimonials";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Reviews: ${REVIEW_SAMENVATTING}`,
  description: `${REVIEW_SAMENVATTING}. Echte reviews over het werk van Ilja Goossens (${site.naam}, Loosdrecht), letterlijk overgenomen.`,
  alternates: { canonical: "/reviews" },
  openGraph: {
    title: `${site.naam} reviews: ${REVIEW_SAMENVATTING}`,
    description:
      "Echte, verifieerbare reviews over het werk van Ilja Goossens, letterlijk overgenomen van Google en Werkspot.",
    type: "website",
    locale: "nl_NL",
  },
};

export default function ReviewsPage() {
  return (
    <>
      <JsonLd
        data={[
          localBusinessSchema({
            aggregateRating: aggregateRating({
              ratingValue: COMBINED_RATING.toFixed(1),
              reviewCount: TOTAL_REVIEW_COUNT,
            }),
            review: TESTIMONIALS.slice(0, 8).map((t) =>
              review({
                author: t.name,
                rating: t.rating,
                body: t.quote,
                datePublished: t.date,
              })
            ),
          }),
          breadcrumbSchema([
            { naam: "Home", pad: "/" },
            { naam: "Reviews", pad: "/reviews" },
          ]),
        ]}
      />

      {/* sr-only samenvatting voor AI / voice search */}
      <section className="sr-only" aria-label="Reviews samenvatting">
        {site.naam} (Ilja Goossens, Loosdrecht) heeft een {REVIEW_SAMENVATTING}:{" "}
        {cijfer(REVIEW_AGGREGATES.google.rating)} op Google uit {REVIEW_AGGREGATES.google.count}{" "}
        reviews en {cijfer(REVIEW_AGGREGATES.werkspot.rating)} op Werkspot uit{" "}
        {REVIEW_AGGREGATES.werkspot.count} reviews. Een deel van die reviews gaat over ander
        timmerwerk dan keukens. Hieronder staan de reviews over keukenmontage en over het werk in
        het algemeen.
      </section>

      {/* Hero met aggregaat-badges */}
      <section className="border-b border-line bg-surface">
        <Container className="py-12 sm:py-16">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
            Klantervaringen
          </p>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold text-ink sm:text-5xl">
            {REVIEW_SAMENVATTING}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Vertrouwen verdien je met goed werk. Hieronder echte reviews over het werk van Ilja,
            letterlijk overgenomen. Eerst de reviews over keukenmontage, daarna de reviews over
            zijn werk in het algemeen. De cijfers gelden voor al zijn werk, niet alleen keukens.
          </p>

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3 sm:gap-5">
            <RatingBadge
              label="Google"
              waarde={cijfer(REVIEW_AGGREGATES.google.rating)}
              meta={`${REVIEW_AGGREGATES.google.count} reviews`}
              href={REVIEW_AGGREGATES.google.profileUrl ?? undefined}
            />
            <RatingBadge
              label="Werkspot"
              waarde={cijfer(REVIEW_AGGREGATES.werkspot.rating)}
              meta={`${REVIEW_AGGREGATES.werkspot.count} reviews`}
              href={REVIEW_AGGREGATES.werkspot.profileUrl ?? undefined}
            />
            <RatingBadge label="Samen" waarde={cijfer(COMBINED_RATING)} meta={`${TOTAL_REVIEW_COUNT} reviews`} />
          </div>
        </Container>
      </section>

      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <ReviewCard key={i} {...t} />
          ))}
        </div>
      </Section>

      <SlotCta />
    </>
  );
}

function RatingBadge({
  label,
  waarde,
  meta,
  href,
}: {
  label: string;
  waarde: string;
  meta: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-line bg-paper p-4 shadow-card sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular-nums text-ink sm:text-3xl">{waarde}</span>
        <Star size={16} className="fill-accent text-accent" />
      </div>
      <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-soft">
        {meta}
        {href && <ArrowRight size={12} />}
      </p>
    </div>
  );

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block transition-opacity hover:opacity-90">
      {inner}
    </a>
  ) : (
    inner
  );
}
