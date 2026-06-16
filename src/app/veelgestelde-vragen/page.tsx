import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { FaqList } from "@/components/sections/FaqList";
import { SlotCta } from "@/components/sections/SlotCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqItems } from "@/lib/content";
import { faqPageSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Veelgestelde vragen over keuken laten plaatsen",
  description:
    "Antwoorden op de meestgestelde vragen over het laten plaatsen van een IKEA-keuken: kosten, snelheid, werkgebied, demontage, apparaten aansluiten en wie de montage uitvoert.",
  alternates: { canonical: "/veelgestelde-vragen" },
};

export default function FaqPage() {
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
