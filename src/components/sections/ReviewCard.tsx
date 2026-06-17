import { Star } from "lucide-react";
import type { Testimonial } from "@/lib/testimonials";

function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { month: "short", year: "numeric" });
}

const SOURCE_LABEL: Record<Testimonial["source"], string> = {
  google: "Google",
  werkspot: "Werkspot",
  website: "Klant",
};

export function ReviewCard({ name, location, quote, rating, date, source, project_type }: Testimonial) {
  return (
    <figure className="flex h-full flex-col rounded-2xl border border-line bg-paper p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex" aria-label={`${rating} van 5 sterren`}>
          {Array.from({ length: 5 }).map((_, s) => (
            <Star
              key={s}
              size={16}
              className={s < rating ? "fill-accent text-accent" : "text-line-strong"}
            />
          ))}
        </div>
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
          {SOURCE_LABEL[source]}
        </span>
      </div>

      <blockquote className="mt-4 flex-1 text-ink">{quote}</blockquote>

      <figcaption className="mt-5 text-sm">
        <span className="font-semibold text-ink-soft">{name}</span>
        <span className="mt-0.5 block text-xs text-muted">
          {[project_type, location, fmtShortDate(date)].filter(Boolean).join(" · ")}
        </span>
      </figcaption>
    </figure>
  );
}
