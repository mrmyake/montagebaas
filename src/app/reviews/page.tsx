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
} from "@/lib/testimonials";

export const metadata: Metadata = {
  title: "Reviews — wat klanten zeggen",
  description: `Beoordeeld met ${REVIEW_AGGREGATES.google.rating.toFixed(1)} op Google en ${REVIEW_AGGREGATES.werkspot.rating.toFixed(1)} op Werkspot. Echte klantervaringen over het vakwerk van Ilja Goossens (Montagebaas, Loosdrecht).`,
  alternates: { canonical: "/reviews" },
  openGraph: {
    title: `Montagebaas reviews — ${REVIEW_AGGREGATES.google.rating.toFixed(1)} op Google, ${REVIEW_AGGREGATES.werkspot.rating.toFixed(1)} op Werkspot`,
    description:
      "Echte, verifieerbare klantervaringen over het maatwerk en de montage van Ilja Goossens.",
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
        Montagebaas (Ilja Goossens, Loosdrecht) is beoordeeld met{" "}
        {REVIEW_AGGREGATES.google.rating.toFixed(1)} sterren op Google uit{" "}
        {REVIEW_AGGREGATES.google.count} reviews en{" "}
        {REVIEW_AGGREGATES.werkspot.rating.toFixed(1)} op Werkspot uit{" "}
        {REVIEW_AGGREGATES.werkspot.count} reviews. Klanten roemen het vakmanschap,
        het meedenken, de eerlijke prijzen en de strakke afwerking — van IKEA-ombouw
        en maatwerk tot cinewalls.
      </section>

      {/* Hero met aggregaat-badges */}
      <section className="border-b border-line bg-surface">
        <Container className="py-12 sm:py-16">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
            Klantervaringen
          </p>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold text-ink sm:text-5xl">
            Wat klanten zeggen
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Vertrouwen verdien je met goed werk. Hieronder echte, verifieerbare reviews
            van het vakwerk van Ilja — van IKEA-ombouw en maatwerk tot complete wanden.
          </p>

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3 sm:gap-5">
            <RatingBadge
              label="Google"
              waarde={REVIEW_AGGREGATES.google.rating.toFixed(1)}
              meta={`${REVIEW_AGGREGATES.google.count} reviews`}
            />
            <RatingBadge
              label="Werkspot"
              waarde={REVIEW_AGGREGATES.werkspot.rating.toFixed(1)}
              meta={`${REVIEW_AGGREGATES.werkspot.count} reviews`}
              href={REVIEW_AGGREGATES.werkspot.profileUrl}
            />
            <RatingBadge label="Projecten" waarde="100+" meta="Gerealiseerd" />
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
        {waarde !== "100+" && <Star size={16} className="fill-accent text-accent" />}
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
