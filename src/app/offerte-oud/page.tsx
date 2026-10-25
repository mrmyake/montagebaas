import type { Metadata } from "next";
import { OudeOffertePagina } from "@/app/offerte/OudeOffertePagina";

/** Terugvaloptie: de oude configurator, twee weken bereikbaar na de livegang van de redesign. Niet indexeren. */
export const metadata: Metadata = {
  title: "Bereken je prijs (oude versie)",
  robots: { index: false, follow: false },
};

export default function OudeOffertePage() {
  return <OudeOffertePagina />;
}
