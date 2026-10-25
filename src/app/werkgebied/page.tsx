import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ArrowRight, Phone } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { SlotCta } from "@/components/sections/SlotCta";
import { stedenBinnenStraal, stedenBuitenStraal, type Stad } from "@/lib/steden";
import { site, whatsappDefault } from "@/lib/site";

export const metadata: Metadata = {
  title: "Werkgebied: tot ongeveer 75 km rond Loosdrecht",
  description:
    `Ilja van ${site.naam} plaatst IKEA-keukens zelf, tot ongeveer 75 km rond Loosdrecht: Utrecht, Hilversum, Amsterdam, Amersfoort en omgeving. Bekijk de plaatsen en bereken je prijs.`,
  alternates: { canonical: "/werkgebied" },
};

function StadLink({ s }: { s: Stad }) {
  return (
    <Link
      href={`/keukenmonteur/${s.slug}`}
      className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-accent"
    >
      <span className="inline-flex items-center gap-2 font-medium text-ink">
        <MapPin size={16} className="text-accent" />
        Keukenmonteur {s.naam}
      </span>
      <ArrowRight
        size={16}
        className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
      />
    </Link>
  );
}

const opNaam = (a: Stad, b: Stad) => a.naam.localeCompare(b.naam);

export default function WerkgebiedPage() {
  const binnen = [...stedenBinnenStraal].sort(opNaam);
  const buiten = [...stedenBuitenStraal].sort(opNaam);

  return (
    <>
      <PageHeader
        eyebrow="Werkgebied"
        titel="Tot ongeveer 75 km rond Loosdrecht"
        intro="Ilja plaatst je keuken zelf. Daarom werken we in een overzichtelijk gebied rond Loosdrecht: Utrecht, Hilversum, Amsterdam, Amersfoort en omgeving. Staat jouw plaats er niet bij maar ligt hij in de buurt? Vraag gewoon een offerte aan."
      />

      <section className="py-12 sm:py-16">
        <Container>
          <h2 className="text-xl font-bold text-ink">Hier werken we</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {binnen.map((s) => (
              <StadLink key={s.slug} s={s} />
            ))}
          </div>

          <div className="mt-14">
            <h2 className="text-xl font-bold text-ink">Verder weg</h2>
            <p className="mt-2 max-w-2xl text-ink-soft">
              Deze plaatsen liggen buiten ons vaste werkgebied. Woon je hier? Bel of app dan even,
              dan kijken we of het past.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
              <a href={site.telefoonLink} className="inline-flex items-center gap-2 text-accent underline">
                <Phone size={15} /> {site.telefoonWeergave}
              </a>
              <a href={whatsappDefault} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                WhatsApp
              </a>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {buiten.map((s) => (
                <StadLink key={s.slug} s={s} />
              ))}
            </div>
          </div>
        </Container>
      </section>

      <SlotCta
        titel="Woon je in de buurt van Loosdrecht?"
        intro="Vraag vrijblijvend een offerte aan en je hoort binnen 24 uur wat het kost."
      />
    </>
  );
}
