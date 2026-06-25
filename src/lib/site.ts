/**
 * Centrale site- en bedrijfsgegevens.
 *
 * ⚠️ EIGENAAR: vul de placeholders hieronder in met ECHTE gegevens vóór livegang.
 * Alles met `TODO_EIGENAAR` is een placeholder. Telefoon-/WhatsApp-nummers moeten in
 * internationaal formaat (zonder spaties) voor de tel:/wa.me-deeplinks.
 */

export const site = {
  naam: "Montagebaas",
  domein: "montagebaas.com",
  url: "https://montagebaas.com",

  // Kernbelofte — rode draad door de hele site
  tagline: "Je IKEA-keuken vakkundig geplaatst",
  belofte: "Vaste prijs vooraf, geen verrassingen, offerte binnen 24 uur. In heel Nederland.",

  // Contact
  telefoonWeergave: "06 - 2917 3468",
  telefoonLink: "tel:+31629173468", // internationaal formaat voor de tel:-deeplink
  whatsappNummer: "31629173468", // internationaal zonder +
  email: "info@montagebaas.com",

  // Bedrijfsgegevens — voor footer + schema.org
  kvk: "74579320", // KvK-nummer
  straat: "Tjalk 68",
  postcode: "1231 TX",
  plaats: "Loosdrecht",
  vestigingsplaats: "Loosdrecht",
  land: "NL",

  // Reviews — echte data leeft in `src/lib/testimonials.ts` (Werkspot + Google).
  // De profiel-URL's voor verificatie:
  werkspotUrl: "https://www.werkspot.nl/profiel/hout-nieuw/reviews",
} as const;

export const whatsappUrl = (bericht?: string) => {
  const base = `https://wa.me/${site.whatsappNummer}`;
  return bericht ? `${base}?text=${encodeURIComponent(bericht)}` : base;
};

// Standaard WhatsApp-openingsbericht
export const whatsappDefault = whatsappUrl(
  "Hoi Montagebaas, ik wil graag een offerte voor het plaatsen van mijn keuken."
);

export const nav = [
  { label: "Kosten", href: "/kosten" },
  { label: "Werkwijze", href: "/werkwijze" },
  { label: "Reviews", href: "/reviews" },
  { label: "Werkgebied", href: "/werkgebied" },
  { label: "Veelgestelde vragen", href: "/veelgestelde-vragen" },
  { label: "Over ons", href: "/over" },
] as const;
