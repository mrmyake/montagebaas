import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { SlotCta } from "@/components/sections/SlotCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { serviceSchema, faqPageSchema } from "@/lib/schema";
import { kostenKaarten, tekstBedragen, extraOpties, extraLabel, type Prijsbron } from "@/lib/prijs-weergave";
import { laadPrijsbron } from "@/lib/prijs-bron";
import { site } from "@/lib/site";

// Bedragen uit de actieve tarievenrij; elk uur opnieuw opgehaald.
export const revalidate = 3600;

const openingszinVoor = (b: ReturnType<typeof tekstBedragen>) =>
  `Een complete montage van een IKEA-keuken kost bij ${site.naam} ongeveer ${b.laagsteBand} tot ${b.hoogsteBand}, inclusief btw en reiskosten.`;

export async function generateMetadata(): Promise<Metadata> {
  const b = tekstBedragen(await laadPrijsbron());
  return {
    title: "Wat kost een IKEA-keuken plaatsen? Prijzen 2026",
    description: `${openingszinVoor(b)} Bekijk de prijzen per keukengrootte en per losse klus, en wat wel en niet is inbegrepen.`,
    alternates: { canonical: "/kosten" },
  };
}

const lossePostenVoor = (bron: Prijsbron) => [
  ...extraOpties(bron).map((e) => ({ label: e.label, sub: e.sub, prijs: extraLabel(e.bedrag) })),
  { label: "Tegelwerk of spatwand", sub: "Maatwerk, apart in je offerte", prijs: "Op aanvraag" },
];

// FAQ-subset specifiek over kosten (voor GEO / AI Overviews)
const kostenFaqVoor = (b: ReturnType<typeof tekstBedragen>, openingszin: string) => [
  {
    vraag: "Wat kost een IKEA-keuken laten plaatsen?",
    antwoord:
      `${openingszin} Een kleine keuken kost ongeveer ${b.klein}, een gemiddelde ${b.gemiddeld} en een grote met eiland ${b.groot}. Zet je de kasten zelf in elkaar? Met Montageklaar betaal je ongeveer ${b.montageklaarScheelt} minder.`,
  },
  {
    vraag: "Zit het aansluiten van apparaten bij de prijs in?",
    antwoord:
      "Ja. Oven, kookplaat, vaatwasser en koelkast aansluiten zit in de prijs, net als het aansluiten van spoelbak en kraan op de bestaande afvoer en water.",
  },
  {
    vraag: "Wat kost het om mijn oude keuken te laten weghalen?",
    antwoord: `Je oude keuken demonteren en afvoeren kost ${b.demontage}, inclusief container.`,
  },
  {
    vraag: "Komen er achteraf kosten bij?",
    antwoord:
      "Nee. Je krijgt vooraf een vaste prijs op maat. Zolang de situatie overeenkomt met je aanvraag betaal je wat is afgesproken. Maatwerk zoals tegelwerk benoemen we apart.",
  },
];

const thClass = "border-b border-line px-4 py-3 text-left text-sm font-semibold text-ink";
const tdClass = "border-b border-line px-4 py-3 text-ink-soft";

export default async function KostenPage() {
  const bron = await laadPrijsbron();
  const b = tekstBedragen(bron);
  const openingszin = openingszinVoor(b);
  const rijen = kostenKaarten(bron);
  const lossePosten = lossePostenVoor(bron);
  const kostenFaq = kostenFaqVoor(b, openingszin);

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
            <strong>{openingszin}</strong> De exacte prijs hangt vooral af van het aantal kasten.
            Apparaten, spoelbak en kraan aansluiten zitten er al in. Zet je de kasten zelf in elkaar?
            Met Montageklaar betaal je ongeveer {b.montageklaarScheelt} minder.
          </p>

          {/* Prijstabel per grootte */}
          <h2 className="mt-12 text-2xl font-bold text-ink">Richtprijzen per keukengrootte</h2>
          <p className="mt-2 text-ink-soft">
            Indicatie voor complete montage, inclusief btw en reiskosten, exclusief extra&apos;s.
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
                    <td className={tdClass}>
                      {r.titel}
                      <span className="block text-sm text-muted">{r.sub}</span>
                    </td>
                    <td className={`${tdClass} font-semibold text-ink`}>{r.band}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Losse posten */}
          <h2 className="mt-12 text-2xl font-bold text-ink">Extra&apos;s en wat al inbegrepen is</h2>
          <p className="mt-2 text-ink-soft">
            Sommige onderdelen zitten al in de prijs. Andere kies je er los bij.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>Onderdeel</th>
                  <th className={thClass}>Prijs</th>
                </tr>
              </thead>
              <tbody>
                {lossePosten.map((p) => (
                  <tr key={p.label}>
                    <td className={tdClass}>
                      {p.label}
                      <span className="block text-sm text-muted">{p.sub}</span>
                    </td>
                    <td className={`${tdClass} font-semibold text-ink`}>{p.prijs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">
            Bedragen zijn indicaties, inclusief btw. Je exacte prijs staat in je offerte. Parkeerkosten
            in Amsterdam zitten niet in de prijs.
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
              De montageprijs hangt vooral af van het aantal kasten dat geplaatst moet worden. Het
              aansluiten van apparaten, spoelbak en kraan zit er al in. Daarbovenop komen alleen de
              extra&apos;s die je kiest: je oude keuken eruit ({b.demontage}, inclusief container),
              een laminaat werkblad op maat zagen ({b.werkbladZagen}) of een lichte
              leidingaanpassing. Die laatste prijzen we pas na een opname ter plekke.
            </p>
            <p>
              Wat <strong>niet</strong> standaard is inbegrepen, is groter leidingwerk, elektra-
              aanpassingen en maatwerk zoals tegelwerk. Dat benoemen we apart in je offerte, zodat je
              nooit voor verrassingen komt te staan.
            </p>
          </div>

          {/* Vergelijking IKEA */}
          <h2 className="mt-14 text-2xl font-bold text-ink">{site.naam} vs. de montage van IKEA zelf</h2>
          <p className="mt-2 text-ink-soft">
            IKEA werkt met een opbouw van starttarief, een bedrag per kast, per apparaat en
            inmeetkosten, plus vaak onaangekondigd &ldquo;voorbereidend werk&rdquo;. Dat maakt de
            eindprijs lastig vooraf in te schatten.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-trust/30 bg-trust-soft p-5">
              <h3 className="font-bold text-ink">Bij {site.naam}</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                {["Vaste prijs vooraf", "Eén vast aanspreekpunt", "Offerte binnen 24 uur", "Ilja plaatst je keuken zelf"].map((t) => (
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
              werk? Je kunt ook alleen het lastige laten afmonteren. Die prijs maken we na overleg.
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
