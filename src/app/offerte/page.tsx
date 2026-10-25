import type { Metadata } from "next";
import { HomeV2 } from "@/components/v2/HomeV2";
import { OudeOffertePagina } from "@/app/offerte/OudeOffertePagina";
import { siteVersie } from "@/lib/site-versie";

// Bedragen uit de actieve tarievenrij; elk uur opnieuw opgehaald.
export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return {
    title: "Bereken je prijs — IKEA-keuken laten plaatsen",
    description:
      siteVersie() === "v2"
        ? "Plak de link naar je IKEA Keukenplanner-ontwerp en zie direct wat montage kost. Of upload je PDF, of beantwoord een paar vragen. Vaste prijs binnen 24 uur."
        : "Plak de link naar je IKEA Keukenplanner-ontwerp, upload je PDF, of bereken in een minuut wat het plaatsen van je IKEA-keuken kost. Vaste prijs vooraf, antwoord binnen 24 uur.",
    alternates: { canonical: "/offerte" },
  };
}

export default function OffertePage() {
  return siteVersie() === "v2" ? <HomeV2 alleenIntake /> : <OudeOffertePagina />;
}
