import { Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/lib/site";

export function SlotCta({
  titel = "Klaar voor een vaste prijs?",
  intro = "Bereken in een minuut wat het plaatsen van je keuken kost en ontvang binnen 24 uur een exacte offerte op maat.",
}: {
  titel?: string;
  intro?: string;
}) {
  return (
    <section className="bg-night text-white">
      <Container className="py-16 text-center sm:py-20">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold sm:text-4xl">{titel}</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">{intro}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/offerte" size="lg">
            Vraag je offerte aan
          </ButtonLink>
          <ButtonLink href={site.telefoonLink} size="lg" variant="secondary" className="!bg-transparent !text-white !border-white/30 hover:!bg-white/10">
            <Phone size={18} /> {site.telefoonWeergave}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
