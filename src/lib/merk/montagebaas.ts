import type { Merk } from "./types";

export const montagebaas: Merk = {
  id: "montagebaas",
  naam: "Montagebaas",
  hosts: ["montagebaas.com", "www.montagebaas.com", "localhost"],
  url: "https://montagebaas.com",
  accent: "#0F7B6C",
  accentDonker: "#0B5E53",
  telefoon: { weergave: "06 2917 3468", link: "tel:+31629173468" },
  whatsapp: {
    nummer: "31629173468",
    standaardBericht: "Hoi Montagebaas, ik wil graag een offerte voor het plaatsen van mijn keuken.",
  },
  email: "info@montagebaas.com",
  kvk: "74579320",
  adres: { straat: "Tjalk 68", postcode: "1231 TX", plaats: "Loosdrecht" },
  werkgebied: {
    tekst:
      "We werken tot ongeveer 75 km rond Loosdrecht: Utrecht, Hilversum, Amsterdam, Amersfoort en omgeving.",
    kort: "Tot 75 km rond Loosdrecht",
    centrum: "Loosdrecht",
    straalKm: 75,
    steden: [
      { naam: "Amsterdam", slug: "amsterdam" },
      { naam: "Utrecht", slug: "utrecht" },
      { naam: "Hilversum", slug: "hilversum" },
      { naam: "Amersfoort", slug: "amersfoort" },
      { naam: "Almere", slug: "almere" },
      { naam: "Haarlem", slug: "haarlem" },
      { naam: "Leiden", slug: "leiden" },
      { naam: "Den Haag", slug: "den-haag" },
      { naam: "Rotterdam", slug: "rotterdam" },
    ],
    parkeren: "In Amsterdam zitten parkeerkosten niet in de prijs.",
  },
  // Bron: docs/design/montagebaas-reviews.md (opgehaald 25-10-2026). Homepage: A2, A3, B1.
  // A1 alleen op de reviewpagina, nooit op de homepage.
  reviews: {
    totaal: { score: "4,9", aantal: 56 },
    google: { score: "5,0", aantal: 25, url: "https://www.google.com/search?q=Montagebaas+-+TVMuur.com+Loosdrecht" },
    werkspot: { score: "4,8", aantal: 31, url: "https://www.werkspot.nl/profiel/hout-nieuw/reviews" },
    homepage: [
      {
        naam: "Stephan van den Hoek",
        plaats: "Nijkerk",
        klus: "Kookeiland",
        bron: "werkspot",
        tekst:
          "Fantastische service door Ilja! Hij heeft een kookeiland voor ons geïnstalleerd en het ziet er top uit. Denkt met je mee en gaat voor kwaliteit en een tevreden klant. Top, volgende keer huren wij hem zeker weer in.",
      },
      {
        naam: "Koen",
        plaats: "Nederhorst den Berg",
        klus: "U-vormige keuken",
        bron: "werkspot",
        tekst:
          "Ilja heeft mijn keuken gemonteerd. Het was meten en passen, maar Ilja bleef flexibel en ging door tot het goed was. Zeer tevreden.",
      },
      {
        naam: "monique rijsdijk",
        bron: "google",
        tekst:
          "Hij is zeer professioneel en werkt erg netjes. betrouwbaar wat ook erg fijn is als je iemand in je huis laat. Wij zijn erg tevreden en krijgen van familie en vrienden ook veel complimenten. Dus kan hem zeker aanbevelen.",
      },
    ],
  },
};
