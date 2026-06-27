import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { SlotCta } from "@/components/sections/SlotCta";
import { steden } from "@/lib/steden";

export const metadata: Metadata = {
  title: "Werkgebied — keukenmonteur in heel Nederland",
  description:
    "Montagebaas plaatst IKEA-keukens door heel Nederland via een netwerk van gescreende monteurs. Bekijk de plaatsen waar we werkzaam zijn en bereken je prijs.",
  alternates: { canonical: "/werkgebied" },
};

export default function WerkgebiedPage() {
  // Groepeer steden per provincie
  const perProvincie = steden.reduce<Record<string, typeof steden>>((acc, s) => {
    (acc[s.provincie] ??= []).push(s);
    return acc;
  }, {});
  const provincies = Object.keys(perProvincie).sort();

  return (
    <>
      <PageHeader
        eyebrow="Werkgebied"
        titel="Keukenmonteur in heel Nederland"
        intro="Via ons netwerk van gescreende, zelfstandige monteurs werken we landelijk. Hieronder vind je de plaatsen met een eigen pagina — staat jouw plaats er niet bij? Vraag gewoon een offerte aan, we werken door heel Nederland."
      />

      <section className="py-12 sm:py-16">
        <Container>
          <div className="space-y-10">
            {provincies.map((prov) => (
              <div key={prov}>
                <h2 className="text-xl font-bold text-ink">{prov}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {perProvincie[prov]
                    .sort((a, b) => a.naam.localeCompare(b.naam))
                    .map((s) => (
                      <Link
                        key={s.slug}
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
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <SlotCta titel="Werken we ook bij jou in de buurt?" intro="Grote kans van wel. Vraag vrijblijvend een offerte aan en je hoort binnen 24 uur wat het kost." />
    </>
  );
}
