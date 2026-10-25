import type { Metadata } from "next";
import { UserCheck, MapPin, Handshake } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { SlotCta } from "@/components/sections/SlotCta";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Over ${site.naam}: Ilja Goossens, keukenmonteur uit Loosdrecht`,
  description:
    `${site.naam} is de eenmanszaak van Ilja Goossens uit Loosdrecht. Ilja plaatst je IKEA-keuken zelf, netjes en compleet, en is je aanspreekpunt van offerte tot oplevering. Werkgebied tot ongeveer 75 km rond Loosdrecht.`,
  alternates: { canonical: "/over" },
};

const punten = [
  {
    icon: UserCheck,
    titel: "Ilja plaatst zelf",
    tekst:
      "Wie de offerte maakt, plaatst ook je keuken. Ilja doet het werk zelf en staat in voor het resultaat. Geen veiling, geen wisselende partijen.",
  },
  {
    icon: MapPin,
    titel: "Dichtbij Loosdrecht",
    tekst:
      "We werken tot ongeveer 75 km rond Loosdrecht: Utrecht, Hilversum, Amsterdam, Amersfoort en omgeving. Woon je verder weg? Bel of app even.",
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
        titel="Eén vakman, van offerte tot oplevering"
        intro={`${site.naam} is een eenmanszaak uit Loosdrecht. Ilja Goossens maakt je offerte, plaatst je keuken zelf en is je vaste aanspreekpunt. Geen anoniem platform.`}
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
              Bij {site.naam} weet je wie er komt: Ilja. Hij beoordeelt je aanvraag, geeft je vooraf
              een vaste prijs en plaatst je keuken zelf, netjes en compleet. Je hebt het hele traject
              één aanspreekpunt, en dat is ook de vakman die het werk doet.
            </p>
            <p>
              Omdat Ilja zelf plaatst, werken we in een overzichtelijk gebied: tot ongeveer 75 km
              rond Loosdrecht. Denk aan Utrecht, Hilversum, Amsterdam, Amersfoort en omgeving. Woon
              je verder weg? Bel of app even, dan kijken we of het past.
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
