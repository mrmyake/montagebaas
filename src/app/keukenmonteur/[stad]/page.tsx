import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Clock, ShieldCheck, ArrowRight, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Werkwijze } from "@/components/sections/Werkwijze";
import { Reviews } from "@/components/sections/Reviews";
import { FaqTeaser } from "@/components/sections/FaqTeaser";
import { SlotCta } from "@/components/sections/SlotCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { localBusinessSchema, serviceSchema, breadcrumbSchema } from "@/lib/schema";
import { steden, stedenBySlug, stedenBinnenStraal } from "@/lib/steden";
import { tekstBedragen } from "@/lib/prijs-weergave";
import { laadPrijsbron } from "@/lib/prijs-bron";
import { site, whatsappDefault } from "@/lib/site";

export const dynamicParams = false;
// Bedragen uit de actieve tarievenrij; elk uur opnieuw opgehaald.
export const revalidate = 3600;

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
  if (!data.binnenStraal) {
    return {
      title: `Keukenmonteur ${data.naam}? Ons werkgebied is rond Loosdrecht`,
      description: `${data.naam} ligt buiten ons vaste werkgebied. Ilja van Montagebaas plaatst IKEA-keukens zelf, tot ongeveer 75 km rond Loosdrecht. Woon je in ${data.naam}? Bel of app even, dan kijken we of het past.`,
      alternates: { canonical: `/keukenmonteur/${data.slug}` },
    };
  }
  return {
    title: `Keukenmonteur ${data.naam}: IKEA keuken laten plaatsen`,
    description: `IKEA-keuken laten plaatsen in ${data.naam}? Ilja plaatst je keuken zelf, netjes en compleet. Vaste prijs vooraf en offerte binnen 24 uur. Bereken je prijs in 1 minuut.`,
    alternates: { canonical: `/keukenmonteur/${data.slug}` },
  };
}

// Prijsindicatie, uit de prijsadapter (nooit zelf bedragen berekenen of hardcoden)

export default async function StadPage({
  params,
}: {
  params: Promise<{ stad: string }>;
}) {
  const { stad } = await params;
  const data = stedenBySlug.get(stad);
  if (!data) notFound();

  const alineas = data.intro.split("\n\n");
  const binnen = data.binnenStraal;
  const indicatie = tekstBedragen(await laadPrijsbron());

  return (
    <>
      <JsonLd
        data={[
          // Alleen steden binnen het werkgebied als areaServed claimen.
          binnen ? localBusinessSchema({ areaServed: data.naam, naamSuffix: data.naam }) : localBusinessSchema(),
          binnen ? serviceSchema({ areaServed: data.naam }) : serviceSchema(),
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
            {binnen ? `Keukenmonteur ${data.naam}: IKEA keuken laten plaatsen` : `Keukenmonteur in ${data.naam}?`}
          </h1>
          {!binnen && (
            <div className="mt-5 max-w-2xl rounded-2xl border border-accent/30 bg-accent-soft p-5">
              <p className="font-semibold text-ink">{data.naam} ligt buiten ons vaste werkgebied</p>
              <p className="mt-1 text-ink-soft">
                Ilja plaatst elke keuken zelf en werkt tot ongeveer 75 km rond Loosdrecht. Ligt jouw
                plaats verder weg? Bel of app dan even, dan kijken we of het past.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={site.telefoonLink}>
                  <Phone size={16} /> Bel {site.telefoonWeergave}
                </ButtonLink>
                <ButtonLink href={whatsappDefault} variant="secondary" target="_blank" rel="noopener noreferrer">
                  App via WhatsApp
                </ButtonLink>
              </div>
            </div>
          )}
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink-soft">
            <li className="inline-flex items-center gap-2"><Clock size={16} className="text-accent" /> Offerte binnen 24 uur</li>
            <li className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-accent" /> Vaste prijs vooraf</li>
            {binnen && (
              <li className="inline-flex items-center gap-2"><MapPin size={16} className="text-accent" /> Werkzaam in {data.naam} en omgeving</li>
            )}
          </ul>
          {binnen && (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/offerte" size="lg">
                Bereken je prijs
              </ButtonLink>
              <ButtonLink href="/kosten" size="lg" variant="secondary">
                Bekijk de prijzen
              </ButtonLink>
            </div>
          )}
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
                {binnen ? `Werkzaam in ${data.naam} en omgeving` : `Wijken en plaatsen rond ${data.naam}`}
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
              <p className="text-sm font-semibold text-accent">
                {binnen ? `Richtprijzen montage in ${data.naam}` : "Richtprijzen montage"}
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-soft">Kleine keuken</dt>
                  <dd className="font-semibold text-ink">{indicatie.klein}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-soft">Gemiddelde keuken</dt>
                  <dd className="font-semibold text-ink">{indicatie.gemiddeld}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-soft">Grote keuken (eiland)</dt>
                  <dd className="font-semibold text-ink">{indicatie.groot}</dd>
                </div>
              </dl>
              <div className="mt-5">
                <ButtonLink href="/offerte" className="w-full">
                  Bereken jouw prijs <ArrowRight size={16} />
                </ButtonLink>
              </div>
              <p className="mt-3 text-xs text-muted">
                Indicatie voor complete montage, inclusief btw en reiskosten. Je exacte prijs ontvang je binnen 24 uur.
              </p>
            </div>
          </aside>
        </div>
      </Section>

      <Werkwijze />
      <Reviews compact />
      <FaqTeaser />
      {binnen ? (
        <SlotCta titel={`Keuken laten plaatsen in ${data.naam}?`} />
      ) : (
        <SlotCta
          titel={`Woon je in ${data.naam}?`}
          intro="Bel of app even, dan kijken we samen of jouw klus past. Ons vaste werkgebied is tot ongeveer 75 km rond Loosdrecht."
        />
      )}

      {/* Interne links naar andere steden */}
      <Section className="bg-surface">
        <SectionHeading titel={binnen ? "Ook in deze plaatsen" : "Hier werken we wel"} />
        <div className="mt-6 flex flex-wrap gap-2">
          {stedenBinnenStraal
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
