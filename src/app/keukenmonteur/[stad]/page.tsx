import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Werkwijze } from "@/components/sections/Werkwijze";
import { Reviews } from "@/components/sections/Reviews";
import { FaqTeaser } from "@/components/sections/FaqTeaser";
import { SlotCta } from "@/components/sections/SlotCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { localBusinessSchema, serviceSchema, breadcrumbSchema } from "@/lib/schema";
import { steden, stedenBySlug } from "@/lib/steden";
import { berekenPrijs, euro } from "@/lib/pricing";

export const dynamicParams = false;

export function generateStaticParams() {
  return steden.map((s) => ({ stad: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stad: string }>;
}): Promise<Metadata> {
  const { stad } = await params;
  const data = stedenBySlug.get(stad);
  if (!data) return {};
  return {
    title: `Keukenmonteur ${data.naam} — IKEA keuken laten plaatsen`,
    description: `IKEA-keuken laten plaatsen in ${data.naam}? Vaste prijs vooraf, offerte binnen 24 uur en een gescreende keukenmonteur uit ${data.provincie}. Bereken je prijs in 1 minuut.`,
    alternates: { canonical: `/keukenmonteur/${data.slug}` },
  };
}

// Regionale prijsindicatie (gebaseerd op de centrale pricing-config)
const indicatie = {
  klein: berekenPrijs({ grootte: "<8", opstelling: "recht", extras: {} }),
  gemiddeld: berekenPrijs({ grootte: "8-15", opstelling: "hoek", extras: {} }),
  groot: berekenPrijs({ grootte: "15+", opstelling: "eiland", extras: {} }),
};

export default async function StadPage({
  params,
}: {
  params: Promise<{ stad: string }>;
}) {
  const { stad } = await params;
  const data = stedenBySlug.get(stad);
  if (!data) notFound();

  const alineas = data.intro.split("\n\n");

  return (
    <>
      <JsonLd
        data={[
          localBusinessSchema({ areaServed: data.naam, naamSuffix: data.naam }),
          serviceSchema({ areaServed: data.naam }),
          breadcrumbSchema([
            { naam: "Home", pad: "/" },
            { naam: "Werkgebied", pad: "/werkgebied" },
            { naam: data.naam, pad: `/keukenmonteur/${data.slug}` },
          ]),
        ]}
      />

      {/* Hero */}
      <section className="border-b border-line bg-surface">
        <Container className="py-12 sm:py-16">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
            <MapPin size={15} /> {data.naam}, {data.provincie}
          </p>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold text-ink sm:text-5xl">
            Keukenmonteur {data.naam} — IKEA keuken laten plaatsen
          </h1>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink-soft">
            <li className="inline-flex items-center gap-2"><Clock size={16} className="text-accent" /> Offerte binnen 24 uur</li>
            <li className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-accent" /> Vaste prijs vooraf</li>
            <li className="inline-flex items-center gap-2"><MapPin size={16} className="text-accent" /> Werkzaam in {data.naam} en omgeving</li>
          </ul>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/offerte" size="lg">
              Bereken je prijs &amp; vraag offerte aan
            </ButtonLink>
            <ButtonLink href="/kosten" size="lg" variant="secondary">
              Bekijk de prijzen
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Unieke intro + lokale ankers */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-ink">
              Je IKEA-keuken laten plaatsen in {data.naam}
            </h2>
            <div className="mt-4 space-y-4 text-lg text-ink-soft">
              {alineas.map((a, i) => (
                <p key={i}>{a}</p>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
              <p className="text-sm font-semibold text-ink">
                Werkzaam in {data.naam} en omgeving
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...data.wijken, ...data.nabij].map((w) => (
                  <span
                    key={w}
                    className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-sm text-ink-soft ring-1 ring-line"
                  >
                    <MapPin size={12} className="text-accent" /> {w}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Regionale prijsindicatie */}
          <aside>
            <div className="rounded-2xl border border-accent/30 bg-accent-soft p-6">
              <p className="text-sm font-semibold text-accent">Richtprijzen montage in {data.naam}</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-soft">Kleine keuken</dt>
                  <dd className="font-semibold text-ink">{euro(indicatie.klein.min)}–{euro(indicatie.klein.max)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-soft">Gemiddelde keuken</dt>
                  <dd className="font-semibold text-ink">{euro(indicatie.gemiddeld.min)}–{euro(indicatie.gemiddeld.max)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-soft">Grote keuken (eiland)</dt>
                  <dd className="font-semibold text-ink">{euro(indicatie.groot.min)}–{euro(indicatie.groot.max)}</dd>
                </div>
              </dl>
              <div className="mt-5">
                <ButtonLink href="/offerte" className="w-full">
                  Bereken jouw prijs <ArrowRight size={16} />
                </ButtonLink>
              </div>
              <p className="mt-3 text-xs text-muted">
                Indicatie inclusief montage. Je exacte prijs ontvang je binnen 24 uur.
              </p>
            </div>
          </aside>
        </div>
      </Section>

      <Werkwijze />
      <Reviews compact />
      <FaqTeaser />
      <SlotCta titel={`Keuken laten plaatsen in ${data.naam}?`} />

      {/* Interne links naar andere steden */}
      <Section className="bg-surface">
        <SectionHeading titel="Ook in deze plaatsen" />
        <div className="mt-6 flex flex-wrap gap-2">
          {steden
            .filter((s) => s.slug !== data.slug)
            .map((s) => (
              <Link
                key={s.slug}
                href={`/keukenmonteur/${s.slug}`}
                className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
              >
                Keukenmonteur {s.naam}
              </Link>
            ))}
        </div>
      </Section>
    </>
  );
}
