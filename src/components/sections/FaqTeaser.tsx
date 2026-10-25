import { ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { FaqList } from "@/components/sections/FaqList";
import { faqItems } from "@/lib/content";
import { laadPrijsbron } from "@/lib/prijs-bron";

export async function FaqTeaser() {
  const items = faqItems(await laadPrijsbron());
  return (
    <Section className="bg-surface">
      <SectionHeading eyebrow="Veelgestelde vragen" titel="Goed om te weten" />
      <div className="mt-10">
        <FaqList items={items.slice(0, 5)} />
      </div>
      <div className="mt-8">
        <ButtonLink href="/veelgestelde-vragen" variant="secondary">
          Alle vragen bekijken <ArrowRight size={18} />
        </ButtonLink>
      </div>
    </Section>
  );
}
