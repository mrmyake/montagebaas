import { Section, SectionHeading } from "@/components/ui/Section";
import { stappen } from "@/lib/content";

export function Werkwijze() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Zo werkt het"
        titel="Van aanvraag tot werkende keuken in 4 stappen"
      />
      <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stappen.map((s) => (
          <li key={s.nummer} className="relative rounded-2xl border border-line bg-surface p-6">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-lg font-bold text-white">
              {s.nummer}
            </span>
            <h3 className="mt-4 text-lg font-bold text-ink">{s.titel}</h3>
            <p className="mt-2 text-sm text-ink-soft">{s.tekst}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
