import { Plus } from "lucide-react";

export interface FaqItem {
  vraag: string;
  antwoord: string;
}

/**
 * FAQ-lijst met native <details> — geen JavaScript nodig (goed voor Core Web Vitals).
 * De FAQPage-schema (JSON-LD) zetten we apart op de paginas die dat nodig hebben.
 */
export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-line rounded-2xl border border-line bg-paper">
      {items.map((item) => (
        <details key={item.vraag} className="group p-5 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
            <span className="text-base font-semibold text-ink sm:text-lg">{item.vraag}</span>
            <Plus
              size={20}
              className="shrink-0 text-accent transition-transform group-open:rotate-45"
            />
          </summary>
          <p className="mt-3 text-ink-soft">{item.antwoord}</p>
        </details>
      ))}
    </div>
  );
}
