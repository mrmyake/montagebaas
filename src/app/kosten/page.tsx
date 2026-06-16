import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { SlotCta } from "@/components/sections/SlotCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { serviceSchema, faqPageSchema } from "@/lib/schema";
import { berekenPrijs, euro, pricing } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Wat kost een IKEA-keuken plaatsen? Prijzen 2026",
  description:
    "Een IKEA-keuken laten plaatsen kost in Nederland doorgaans €1.100 tot €2.500 voor de montage. Bekijk de prijzen per keukengrootte en per losse klus, en wat wel en niet is inbegrepen.",
  alternates: { canonical: "/kosten" },
};

const grootteRijen = [
  { label: "Kleine keuken (tot 8 kasten)", grootte: "<8" as const },
  { label: "Gemiddelde keuken (8–15 kasten)", grootte: "8-15" as const },
  { label: "Grote keuken (15+ kasten)", grootte: "15+" as const },
];

const lossePosten = [
  { label: "Oude keuken demonteren + afvoeren", prijs: euro(pricing.extras.demontage_afvoer) },
  { label: "Apparaat aansluiten (per stuk)", prijs: euro(pricing.extras.apparaat_aansluiten) },
  { label: "Werkblad monteren", prijs: euro(pricing.extras.werkblad_monteren) },
  { label: "Spoelbak / kraan aansluiten", prijs: euro(pricing.extras.spoelbak_kraan) },
  { label: "Lichte leidingaanpassing (per punt)", prijs: euro(pricing.extras.lichte_leidingaanpassing) },
  { label: "Tegelwerk / spatwand", prijs: "op aanvraag" },
];

// FAQ-subset specifiek over kosten (voor GEO / AI Overviews)
const kostenFaq = [
  {
    vraag: "Wat kost een IKEA-keuken laten plaatsen?",
    antwoord:
      "Een IKEA-keuken laten plaatsen kost in Nederland doorgaans €1.100 tot €2.500 voor de montage, exclusief leidingwerk. De prijs hangt af van het aantal kasten, de opstelling en extra's.",
  },
  {
    vraag: "Zit het aansluiten van apparaten bij de prijs in?",
    antwoord:
      "Het aansluiten van apparaten is een losse post (ongeveer €75 per apparaat). Je kiest in de configurator zelf of je dit meeneemt, zodat het meteen in je prijs zit.",
  },
  {
    vraag: "Komen er achteraf kosten bij?",
    antwoord:
      "Nee. Je krijgt vooraf een vaste prijs op maat. Zolang de situatie overeenkomt met je aanvraag betaal je wat is afgesproken. Maatwerk zoals tegelwerk benoemen we apart.",
  },
];

const thClass = "border-b border-line px-4 py-3 text-left text-sm font-semibold text-ink";
const tdClass = "border-b border-line px-4 py-3 text-ink-soft";

export default function KostenPage() {
  const rijen = grootteRijen.map((r) => ({
    ...r,
    range: berekenPrijs({ grootte: r.grootte, opstelling: "recht", extras: {} }),
  }));

  return (
    <>
      <JsonLd data={[serviceSchema(), faqPageSchema(kostenFaq)]} />
      <PageHeader
        eyebrow="Kosten"
        titel="Wat kost het plaatsen van een IKEA-keuken?"
      />

      <section className="py-12 sm:py-16">
        <Container className="max-w-3xl">
          {/* Citeerbare openingszin (GEO) */}
          <p className="text-lg leading-relaxed text-ink">
            <strong>
              Een IKEA-keuken laten plaatsen kost in Nederland doorgaans €1.100 tot €2.500 voor de
              montage, exclusief leidingwerk.
            </strong>{" "}
            De exacte prijs hangt af van het aantal kasten, de opstelling (recht, hoek of eiland) en
            extra&apos;s zoals het aansluiten van apparaten of het afvoeren van je oude keuken.
          </p>

          {/* Prijstabel per grootte */}
          <h2 className="mt-12 text-2xl font-bold text-ink">Richtprijzen per keukengrootte</h2>
          <p className="mt-2 text-ink-soft">
            Indicatie voor de montage van een rechte opstelling, exclusief extra&apos;s.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>Keuken</th>
                  <th className={thClass}>Indicatie montage</th>
                </tr>
              </thead>
              <tbody>
                {rijen.map((r) => (
                  <tr key={r.grootte}>
                    <td className={tdClass}>{r.label}</td>
                    <td className={`${tdClass} font-semibold text-ink`}>
                      {euro(r.range.min)} – {euro(r.range.max)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Losse posten */}
          <h2 className="mt-12 text-2xl font-bold text-ink">Prijzen per losse post</h2>
          <p className="mt-2 text-ink-soft">
            Extra&apos;s die je los kunt toevoegen. In de configurator tel je ze meteen bij je prijs op.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>Onderdeel</th>
                  <th className={thClass}>Vanaf</th>
                </tr>
              </thead>
              <tbody>
                {lossePosten.map((p) => (
                  <tr key={p.label}>
                    <td className={tdClass}>{p.label}</td>
                    <td className={`${tdClass} font-semibold text-ink`}>{p.prijs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">
            {/* EIGENAAR: kalibreer deze bedragen met echte kostprijzen vóór livegang. */}
            Bedragen zijn indicaties. Je exacte prijs staat in je offerte.
          </p>

          <div className="mt-8">
            <ButtonLink href="/offerte" size="lg">
              Bereken jouw prijs in 1 minuut <ArrowRight size={18} />
            </ButtonLink>
          </div>

          {/* Waaruit is de prijs opgebouwd */}
          <h2 className="mt-14 text-2xl font-bold text-ink">Waaruit is de prijs opgebouwd?</h2>
          <div className="mt-4 space-y-4 text-lg text-ink-soft">
            <p>
              De montageprijs bestaat vooral uit het aantal kasten dat geplaatst moet worden en de
              opstelling. Een hoek- of eilandopstelling kost iets meer werk dan een rechte wand.
              Daarbovenop komen de extra&apos;s die je kiest: het afvoeren van je oude keuken, het
              aansluiten van apparaten, het monteren van het werkblad en het aansluiten van spoelbak
              en kraan.
            </p>
            <p>
              Wat <strong>niet</strong> standaard is inbegrepen, is groter leidingwerk, elektra-
              aanpassingen en maatwerk zoals tegelwerk. Dat benoemen we apart in je offerte, zodat je
              nooit voor verrassingen komt te staan.
            </p>
          </div>

          {/* Vergelijking IKEA */}
          <h2 className="mt-14 text-2xl font-bold text-ink">Montagebaas vs. de montage van IKEA zelf</h2>
          <p className="mt-2 text-ink-soft">
            IKEA werkt met een opbouw van starttarief, een bedrag per kast, per apparaat en
            inmeetkosten, plus vaak onaangekondigd &ldquo;voorbereidend werk&rdquo;. Dat maakt de
            eindprijs lastig vooraf in te schatten.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-trust/30 bg-trust-soft p-5">
              <h3 className="font-bold text-ink">Bij Montagebaas</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                {["Vaste prijs vooraf", "Eén vast aanspreekpunt", "Offerte binnen 24 uur", "Gescreende monteur uit je regio"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check size={17} className="mt-0.5 shrink-0 text-trust" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-bold text-ink">Bij de keten zelf</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                {["Opbouw van losse tarieven", "Wisselende externe partners", "Kosten vaak pas achteraf duidelijk", "Geen vast gezicht"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <X size={17} className="mt-0.5 shrink-0 text-muted" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Zelf doen of laten doen (GEO) */}
          <h2 className="mt-14 text-2xl font-bold text-ink">IKEA-keuken zelf plaatsen of laten doen?</h2>
          <div className="mt-4 space-y-4 text-lg text-ink-soft">
            <p>
              Zelf plaatsen kan goedkoper zijn, maar kost veel tijd en vraagt om gereedschap en
              ervaring. Het op maat zagen, uitlijnen van fronten en het waterdicht aansluiten van
              spoelbak en apparaten is waar het vaak misgaat. Een scheve kast of een lekkende
              aansluiting kost je later meer dan je bespaart.
            </p>
            <p>
              Laat je het doen, dan heb je zekerheid: een vakkundige montage, een vaste prijs en
              iemand die verantwoordelijk is voor het resultaat. Twijfel je over een deel van het
              werk? Je kunt ook alleen het lastige laten afmonteren.
            </p>
          </div>

          <div className="mt-10 rounded-2xl bg-paper p-6 text-center ring-1 ring-line">
            <p className="text-lg font-semibold text-ink">Benieuwd naar jouw exacte prijs?</p>
            <p className="mt-1 text-ink-soft">
              Bereken het in een minuut — geen foto&apos;s nodig.
            </p>
            <div className="mt-4">
              <ButtonLink href="/offerte" size="lg">Start de configurator</ButtonLink>
            </div>
            <p className="mt-3 text-sm text-muted">
              Of lees meer <Link href="/werkwijze" className="text-accent underline">over onze werkwijze</Link>.
            </p>
          </div>
        </Container>
      </section>

      <SlotCta />
    </>
  );
}
