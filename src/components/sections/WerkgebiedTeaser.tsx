import { MapPin, ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";

const grotePlaatsen = [
  "Amsterdam", "Rotterdam", "Den Haag", "Utrecht", "Eindhoven", "Groningen",
  "Tilburg", "Almere", "Breda", "Nijmegen", "Haarlem", "Arnhem",
  "Amersfoort", "Zwolle", "Apeldoorn", "Leiden",
];

export function WerkgebiedTeaser() {
  return (
    <Section>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Werkgebied"
            titel="Een gescreende monteur door heel Nederland"
            intro="Via ons netwerk werken we landelijk. Je krijgt een vakman uit je eigen regio, met Montagebaas als vast aanspreekpunt."
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
            + heel NL
          </span>
        </div>
      </div>
    </Section>
  );
}
