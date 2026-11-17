import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { FaqList } from "@/components/sections/FaqList";
import { SlotCta } from "@/components/sections/SlotCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqItems as faqItemsVoor } from "@/lib/content";
import { faqPageSchema } from "@/lib/schema";
import { laadPrijsbron } from "@/lib/prijs-bron";

// Bedragen in de antwoorden komen uit de actieve tarievenrij; elk uur opnieuw opgehaald.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Veelgestelde vragen over keuken laten plaatsen",
  description:
    "Antwoorden op veelgestelde vragen over een IKEA-keuken laten plaatsen: kosten, snelheid, werkgebied, demontage en apparaten aansluiten.",
  alternates: { canonical: "/veelgestelde-vragen" },
};

export default async function FaqPage() {
  const faqItems = faqItemsVoor(await laadPrijsbron());
  return (
    <>
      <JsonLd data={faqPageSchema(faqItems)} />
      <PageHeader
        eyebrow="Veelgestelde vragen"
        titel="Veelgestelde vragen"
        intro="Geen antwoord op je vraag? Bel of app ons gerust — we helpen je graag verder."
      />
      <section className="py-12 sm:py-16">
        <Container>
          <FaqList items={faqItems} />
        </Container>
      </section>
      <SlotCta />
    </>
  );
}
