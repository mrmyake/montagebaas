import { ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { prijsScenarios } from "@/lib/content";
import { berekenPrijs, euro } from "@/lib/pricing";

export function PrijsTeaser() {
  const scenarios = prijsScenarios.map((s) => ({
    ...s,
    range: berekenPrijs({ grootte: s.grootte, opstelling: s.opstelling, extras: s.extras }),
  }));

  return (
    <Section className="bg-surface">
      <SectionHeading
        eyebrow="Prijsindicatie"
        titel="Wat kost het ongeveer?"
        intro="Drie veelvoorkomende keukens met een richtprijs voor de montage. Jouw exacte prijs bereken je in een minuut."
      />

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {scenarios.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col rounded-2xl border p-6 shadow-card ${
              i === 1 ? "border-accent ring-1 ring-accent/20" : "border-line bg-paper"
            }`}
          >
            {i === 1 && (
              <span className="mb-3 inline-flex w-fit rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">
                Meest gekozen
              </span>
            )}
            <h3 className="text-lg font-bold text-ink">{s.label}</h3>
            <p className="mt-1 text-sm text-muted">{s.omschrijving}</p>
            <p className="mt-5 text-3xl font-bold text-ink">
              {euro(s.range.min)} <span className="text-muted">–</span> {euro(s.range.max)}
            </p>
            <p className="mt-1 text-sm text-muted">indicatie, inclusief montage</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <ButtonLink href="/offerte" size="lg">
          Bereken jouw prijs <ArrowRight size={18} />
        </ButtonLink>
        <p className="max-w-md text-sm text-muted">
          Dit zijn indicaties. Je ontvangt binnen 24 uur een exacte offerte op maat — vaste prijs,
          geen verrassingen.
        </p>
      </div>
    </Section>
  );
}
