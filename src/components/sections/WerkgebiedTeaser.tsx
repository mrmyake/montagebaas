import { MapPin, ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";

const grotePlaatsen = [
  "Loosdrecht", "Hilversum", "Utrecht", "Amsterdam", "Amersfoort", "Almere",
  "Bussum", "Zeist", "Soest", "Baarn", "Maarssen", "Huizen",
  "Haarlem", "Leiden", "Den Haag", "Rotterdam",
];

export function WerkgebiedTeaser() {
  return (
    <Section>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Werkgebied"
            titel="Tot ongeveer 75 km rond Loosdrecht"
            intro="Ilja plaatst je keuken zelf. Hij werkt in Utrecht, Hilversum, Amsterdam, Amersfoort en omgeving. Woon je verder weg? Bel of app even, dan kijken we of het past."
          />
          <div className="mt-6">
            <ButtonLink href="/werkgebied" variant="secondary">
              Bekijk alle plaatsen <ArrowRight size={18} />
            </ButtonLink>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {grotePlaatsen.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft"
            >
              <MapPin size={13} className="text-accent" />
              {p}
            </span>
          ))}
          <span className="inline-flex items-center rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-white">
            + omgeving
          </span>
        </div>
      </div>
    </Section>
  );
}
