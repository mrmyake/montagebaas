import { UserCheck, BadgeEuro, Zap } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { pijlers } from "@/lib/content";

const iconen = [UserCheck, BadgeEuro, Zap];

export function Pijlers() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Waarom Montagebaas"
        titel="Grip, kwaliteit en gemak — zonder verrassingen"
        intro="Geen prijsvechtersveiling en geen anoniem platform. Wel een vakman die zijn zaken op orde heeft."
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {pijlers.map((p, i) => {
          const Icon = iconen[i];
          return (
            <div
              key={p.titel}
              className="rounded-2xl border border-line bg-surface p-6 shadow-card"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-accent">
                <Icon size={24} />
              </div>
              <h3 className="mt-5 text-xl font-bold text-ink">{p.titel}</h3>
              <p className="mt-2 text-ink-soft">{p.tekst}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
