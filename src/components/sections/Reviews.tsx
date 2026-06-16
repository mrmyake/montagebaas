import { Star, Quote } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/lib/site";

export interface Review {
  naam: string;
  plaats?: string;
  sterren: number; // 1..5
  tekst: string;
}

/**
 * Reviews-sectie. Toont echte reviews zodra `site.hasReviews` true is en er data is.
 * Zonder echte reviews tonen we GEEN nep-sterren of nep-aantallen (misleidend + SEO-risico),
 * maar een eerlijke boodschap. Vul `reviews` met echte data zodra beschikbaar.
 */
export function Reviews({
  reviews = [],
  compact = false,
}: {
  reviews?: Review[];
  compact?: boolean;
}) {
  const heeftReviews = site.hasReviews && reviews.length > 0;

  return (
    <Section className="bg-surface">
      <SectionHeading
        eyebrow="Klantervaringen"
        titel={heeftReviews ? "Wat klanten zeggen" : "Reviews"}
        center
      />

      {heeftReviews ? (
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {(compact ? reviews.slice(0, 3) : reviews).map((r, i) => (
            <figure key={i} className="rounded-2xl border border-line bg-paper p-6 shadow-card">
              <div className="flex" aria-label={`${r.sterren} van 5 sterren`}>
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    size={18}
                    className={s < r.sterren ? "fill-accent text-accent" : "text-line-strong"}
                  />
                ))}
              </div>
              <blockquote className="mt-4 text-ink">{r.tekst}</blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-ink-soft">
                {r.naam}
                {r.plaats && <span className="font-normal text-muted"> · {r.plaats}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed border-line-strong bg-paper p-8 text-center">
          <Quote className="mx-auto text-accent" size={28} />
          <p className="mt-4 text-lg font-medium text-ink">
            We zijn net gestart met het verzamelen van reviews.
          </p>
          <p className="mt-2 text-ink-soft">
            Vertrouwen verdien je met goed werk en eerlijke prijzen — niet met verzonnen
            beoordelingen. De eerste echte klantervaringen verschijnen hier binnenkort.
          </p>
          <div className="mt-6">
            <ButtonLink href="/offerte">Vraag vrijblijvend een offerte aan</ButtonLink>
          </div>
        </div>
      )}
    </Section>
  );
}
