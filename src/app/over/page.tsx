import type { Metadata } from "next";
import { UserCheck, ShieldCheck, Handshake } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { SlotCta } from "@/components/sections/SlotCta";

export const metadata: Metadata = {
  title: "Over Montagebaas — hoe ons netwerk werkt",
  description:
    "Montagebaas verbindt klanten met gescreende, zelfstandige keukenmonteurs en bewaakt prijs en kwaliteit. Eén vast aanspreekpunt van offerte tot oplevering, in heel Nederland.",
  alternates: { canonical: "/over" },
};

const punten = [
  {
    icon: UserCheck,
    titel: "Gescreende monteurs",
    tekst:
      "We werken met zelfstandige vakmensen die we selecteren op kwaliteit en ervaring. Je krijgt een monteur uit je eigen regio.",
  },
  {
    icon: ShieldCheck,
    titel: "Wij bewaken prijs én kwaliteit",
    tekst:
      "Montagebaas bepaalt de prijs vooraf en blijft verantwoordelijk voor het resultaat. Geen veiling, geen wisselende partijen.",
  },
  {
    icon: Handshake,
    titel: "Eén vast aanspreekpunt",
    tekst:
      "Van je eerste aanvraag tot de oplevering heb je één contact. Vragen of wijzigingen? Je weet bij wie je moet zijn.",
  },
];

export default function OverPage() {
  return (
    <>
      <PageHeader
        eyebrow="Over ons"
        titel="Eén aanspreekpunt, een netwerk van vakmensen"
        intro="Montagebaas is geen eenmanszaak en geen anoniem platform. We halen de aanvraag binnen, bepalen de prijs en bewaken de kwaliteit — de montage doet een gescreende monteur dicht bij jou."
      />

      <section className="py-12 sm:py-16">
        <Container className="max-w-3xl">
          <div className="prose-tekst space-y-4 text-lg text-ink-soft">
            <p>
              Een keuken laten plaatsen voelt vaak als een gok: bij een leadplatform laat je je
              gegevens achter en word je gebeld door allerlei partijen, en bij grote ketens heb je
              geen idee wie er straks voor je deur staat. Dat kan beter.
            </p>
            <p>
              Bij Montagebaas regelen wíj het. We beoordelen je aanvraag, geven je een vaste prijs
              vooraf, en koppelen je aan een vakkundige, gescreende keukenmonteur uit je eigen
              regio. Jij hebt gedurende het hele traject één vast aanspreekpunt — van offerte tot
              oplevering.
            </p>
            <p>
              Zo combineren we het beste van twee werelden: de betrouwbaarheid en grip van één merk,
              met de snelheid en lokale aanwezigheid van een landelijk netwerk.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {punten.map((p) => (
              <div key={p.titel} className="rounded-2xl border border-line bg-surface p-6">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
                  <p.icon size={22} />
                </div>
                <h2 className="mt-4 text-lg font-bold text-ink">{p.titel}</h2>
                <p className="mt-2 text-sm text-ink-soft">{p.tekst}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <SlotCta titel="Benieuwd wat het bij jou kost?" />
    </>
  );
}
