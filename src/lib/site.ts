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

  // Contact — PLACEHOLDERS, eigenaar invullen
  telefoonWeergave: "TODO_EIGENAAR (bv. 085 - 123 45 67)",
  telefoonLink: "tel:+3185TODO", // TODO_EIGENAAR: internationaal, bv. tel:+31851234567
  whatsappNummer: "31600000000", // TODO_EIGENAAR: internationaal zonder +, bv. 31612345678
  email: "offerte@montagebaas.com", // TODO_EIGENAAR

  // Bedrijfsgegevens — PLACEHOLDERS voor footer + schema.org
  kvk: "TODO_EIGENAAR", // KvK-nummer
  vestigingsplaats: "Nederland",
  land: "NL",

  // Reviews — pas aan zodra er ECHTE, verifieerbare reviews zijn.
  // Laat hasReviews op false tot dat zo is; dan géén AggregateRating-schema tonen.
  hasReviews: false,
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
