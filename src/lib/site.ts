/**
 * Centrale site- en bedrijfsgegevens voor de pagina's van vóór de redesign.
 * Naam, domein en contact komen uit het actieve merk (src/lib/merk), zodat een
 * merkwissel overal doorwerkt. Alleen op de server: clientcomponenten krijgen
 * wat ze nodig hebben als prop.
 */
import { huidigMerk, siteUrl } from "@/lib/merk";

const merk = huidigMerk();

export const site = {
  naam: merk.naam,
  domein: merk.domein,
  url: siteUrl(merk),

  // Kernbelofte — rode draad door de hele site
  tagline: "Je IKEA-keuken vakkundig geplaatst",
  belofte: "Vaste prijs vooraf, geen verrassingen, offerte binnen 24 uur. Ilja plaatst je keuken zelf, tot ongeveer 75 km rond Loosdrecht.",
  werkgebied: "Tot ongeveer 75 km rond Loosdrecht",

  // Contact
  telefoonWeergave: "06 - 2917 3468",
  telefoonLink: merk.telefoon.link, // internationaal formaat voor de tel:-deeplink
  whatsappNummer: merk.whatsapp.nummer, // internationaal zonder +
  whatsappGroet: merk.whatsapp.groet, // "Hoi Montagebaas"
  email: merk.email,

  // Bedrijfsgegevens — voor footer + schema.org
  kvk: merk.kvk,
  straat: merk.adres.straat,
  postcode: merk.adres.postcode,
  plaats: merk.adres.plaats,
  vestigingsplaats: merk.adres.plaats,
  land: "NL",
} as const;

export const whatsappUrl = (bericht?: string) => {
  const base = `https://wa.me/${site.whatsappNummer}`;
  return bericht ? `${base}?text=${encodeURIComponent(bericht)}` : base;
};

// Standaard WhatsApp-openingsbericht
export const whatsappDefault = whatsappUrl(merk.whatsapp.standaardBericht);

export { nav } from "@/lib/nav";
