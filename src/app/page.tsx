import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { Pijlers } from "@/components/sections/Pijlers";
import { PrijsTeaser } from "@/components/sections/PrijsTeaser";
import { Werkwijze } from "@/components/sections/Werkwijze";
import { Reviews } from "@/components/sections/Reviews";
import { WerkgebiedTeaser } from "@/components/sections/WerkgebiedTeaser";
import { FaqTeaser } from "@/components/sections/FaqTeaser";
import { SlotCta } from "@/components/sections/SlotCta";
import { HomeV2 } from "@/components/v2/HomeV2";
import { siteVersie } from "@/lib/site-versie";
import { site } from "@/lib/site";

// Bedragen uit de actieve tarievenrij; elk uur opnieuw opgehaald.
export const revalidate = 3600;

export function generateMetadata(): Metadata {
  if (siteVersie() === "v2") {
    return {
      title: { absolute: `IKEA-keuken laten plaatsen voor een vaste prijs | ${site.naam}` },
      description:
        "Plak de link naar je IKEA Keukenplanner-ontwerp en zie direct wat montage kost. Vaste prijs binnen 24 uur. Ilja plaatst je keuken zelf, tot 75 km rond Loosdrecht.",
      alternates: { canonical: "/" },
    };
  }
  return {
    description:
      "Je IKEA-keuken vakkundig laten plaatsen tegen een vaste prijs. Offerte binnen 24 uur en één vast aanspreekpunt. Ilja plaatst je keuken zelf, tot ongeveer 75 km rond Loosdrecht.",
    alternates: { canonical: "/" },
  };
}

export default function Home() {
  if (siteVersie() === "v2") return <HomeV2 />;
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
