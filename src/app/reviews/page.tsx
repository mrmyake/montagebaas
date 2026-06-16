import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reviews, type Review } from "@/components/sections/Reviews";
import { SlotCta } from "@/components/sections/SlotCta";

export const metadata: Metadata = {
  title: "Reviews & klantervaringen",
  description:
    "Klantervaringen over het laten plaatsen van een keuken door Montagebaas. Eerlijk en verifieerbaar — geen verzonnen beoordelingen.",
  alternates: { canonical: "/reviews" },
};

// ⚠️ EIGENAAR: vul deze lijst met ECHTE reviews en zet site.hasReviews op true.
// Gebruik nooit nep-reviews — dat is misleidend en riskant voor SEO.
const reviews: Review[] = [];

export default function ReviewsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Klantervaringen"
        titel="Reviews"
        intro="Vertrouwen verdien je met goed werk. Hier verschijnen de echte ervaringen van onze klanten."
      />
      <Reviews reviews={reviews} />
      <SlotCta />
    </>
  );
}
