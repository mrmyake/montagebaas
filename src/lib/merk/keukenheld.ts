import type { Merk } from "./types.ts";
import { montagebaas } from "./montagebaas.ts";

/**
 * De Keukenheld: dezelfde zaak als Montagebaas onder een nieuwe naam. Kleuren,
 * telefoon, adres, werkgebied en reviews zijn gelijk; alleen naam, domein, mail,
 * logo en iconen wijken af. Geen "Montagebaas" in iets wat een klant ziet.
 */
export const keukenheld: Merk = {
  ...montagebaas,
  id: "keukenheld",
  naam: "De Keukenheld",
  domein: "dekeukenheld.nl",
  url: "https://dekeukenheld.nl",
  whatsapp: {
    ...montagebaas.whatsapp,
    groet: "Hoi",
    standaardBericht: "Hoi, ik wil graag een offerte voor het plaatsen van mijn keuken.",
  },
  email: "info@dekeukenheld.nl",
  onderwerpBevestiging: "Je aanvraag bij De Keukenheld",
  afzender: "De Keukenheld <noreply@dekeukenheld.nl>",
  footerJuridisch: "De Keukenheld is ingeschreven als handelsnaam onder KvK 74579320. Geen onderdeel van IKEA.",
  logo: { src: "/brands/keukenheld/logo-beeldmerk.png", breedte: 726, hoogte: 645 },
  logoStructured: "/brands/keukenheld/icon-512.png",
  ogImage: "/brands/keukenheld/og-image.png",
  iconen: {
    favicon: "/brands/keukenheld/favicon.ico",
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/brands/keukenheld/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brands/keukenheld/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brands/keukenheld/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: { url: "/brands/keukenheld/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    manifest: [
      { url: "/brands/keukenheld/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brands/keukenheld/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  reviews: {
    ...montagebaas.reviews,
    // Bedrijfsprofiel, zonder /review (dat opent het schrijfvenster; wij tonen de reviews).
    google: { ...montagebaas.reviews.google, url: "https://g.page/r/CR7MyzqJoUHcEBM" },
  },
};
