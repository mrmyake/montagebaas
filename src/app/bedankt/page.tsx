import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckCircle2, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/brand/WhatsappIcon";
import { site, whatsappDefault } from "@/lib/site";
import { ConversionTracker } from "@/components/analytics/ConversionTracker";
import { TekeningIndicatie } from "@/components/analytics/TekeningIndicatie";

export const metadata: Metadata = {
  title: "Bedankt voor je aanvraag",
  description: "Je offerteaanvraag is binnen. Je hoort binnen 24 uur van ons.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/bedankt" },
};

export default function BedanktPage() {
  return (
    <section className="py-20 sm:py-28">
      <ConversionTracker />
      <Container className="max-w-xl text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-trust-soft text-trust">
          <CheckCircle2 size={36} />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-ink sm:text-4xl">Je aanvraag is binnen</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Bedankt! We bekijken je aanvraag en je hoort <strong>binnen 24 uur</strong> van ons met
          een exacte offerte op maat.
        </p>

        {/* Indicatieprijs uit het tekening-upload-pad (rendert niets op het formulier-pad) */}
        <Suspense fallback={null}>
          <TekeningIndicatie />
        </Suspense>

        <p className="mt-6 text-ink-soft">
          Liever direct contact? Bel of app ons gerust.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href={site.telefoonLink} variant="secondary" size="lg">
            <Phone size={18} /> {site.telefoonWeergave}
          </ButtonLink>
          <ButtonLink href={whatsappDefault} variant="trust" size="lg">
            <WhatsappIcon size={18} /> WhatsApp ons
          </ButtonLink>
        </div>
        <p className="mt-10">
          <ButtonLink href="/" variant="ghost">
            Terug naar home
          </ButtonLink>
        </p>
      </Container>
    </section>
  );
}
