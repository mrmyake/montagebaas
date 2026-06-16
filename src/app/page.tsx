import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { Pijlers } from "@/components/sections/Pijlers";
import { PrijsTeaser } from "@/components/sections/PrijsTeaser";
import { Werkwijze } from "@/components/sections/Werkwijze";
import { Reviews } from "@/components/sections/Reviews";
import { WerkgebiedTeaser } from "@/components/sections/WerkgebiedTeaser";
import { FaqTeaser } from "@/components/sections/FaqTeaser";
import { SlotCta } from "@/components/sections/SlotCta";

export const metadata: Metadata = {
  description:
    "Je IKEA-keuken vakkundig laten plaatsen tegen een vaste prijs. Offerte binnen 24 uur, één vast aanspreekpunt en een gescreende monteur uit je eigen regio. In heel Nederland.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <Hero />
      <Pijlers />
      <PrijsTeaser />
      <Werkwijze />
      <Reviews />
      <WerkgebiedTeaser />
      <FaqTeaser />
      <SlotCta />
    </>
  );
}
