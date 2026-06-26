import type { Metadata } from "next";
import { Clock, MapPin, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Configurator } from "@/components/configurator/Configurator";
import { TekeningUpload } from "@/components/configurator/TekeningUpload";

export const metadata: Metadata = {
  title: "Offerte aanvragen — prijs in 1 minuut",
  description:
    "Bereken in een minuut wat het plaatsen van je IKEA-keuken kost en vraag een offerte aan. Vaste prijs vooraf, antwoord binnen 24 uur. Geen foto's nodig.",
  alternates: { canonical: "/offerte" },
};

const usps = [
  { icon: Clock, text: "Offerte binnen 24 uur" },
  { icon: ShieldCheck, text: "Vaste prijs vooraf" },
  { icon: MapPin, text: "Heel Nederland" },
];

export default function OffertePage() {
  return (
    <section className="py-10 sm:py-14">
      <Container className="max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">
            Bereken je prijs &amp; vraag een offerte aan
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-ink-soft">
            Beantwoord een paar korte vragen. Je ziet meteen een prijsindicatie en ontvangt
            binnen 24 uur een exacte offerte op maat.
          </p>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-ink-soft">
            {usps.map((u) => (
              <li key={u.text} className="inline-flex items-center gap-1.5">
                <u.icon size={16} className="text-accent" />
                {u.text}
              </li>
            ))}
          </ul>
        </div>

        {/* De snelweg: tekening-upload bovenaan */}
        <TekeningUpload />

        {/* Scheiding naar het hoofdpad (formulier) */}
        <div className="my-8 flex items-center gap-4">
          <span className="h-px flex-1 bg-line" />
          <span className="shrink-0 text-sm font-medium text-muted">
            of beantwoord een paar korte vragen
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <Configurator />

        {/* Zachte nudge terug naar de upload */}
        <p className="mt-6 text-center text-sm text-muted">
          Heb je toch een IKEA-plan? Stuur het hierboven mee voor een exacte vaste prijs in
          plaats van een indicatie.
        </p>
      </Container>
    </section>
  );
}
