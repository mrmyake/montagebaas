import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Werkwijze } from "@/components/sections/Werkwijze";
import { SlotCta } from "@/components/sections/SlotCta";

export const metadata: Metadata = {
  title: "Zo werkt het — keuken laten plaatsen in 4 stappen",
  description:
    "Van aanvraag tot werkende keuken in vier stappen: configurator, exacte offerte binnen 24 uur, inplannen wanneer het jou uitkomt, en vakkundige montage door een gescreende monteur.",
  alternates: { canonical: "/werkwijze" },
};

export default function WerkwijzePage() {
  return (
    <>
      <PageHeader
        eyebrow="Werkwijze"
        titel="Zo werkt het"
        intro="Helder en zonder gedoe. Je weet vooraf wat je krijgt en wat het kost."
      />
      <Werkwijze />
      <SlotCta />
    </>
  );
}
