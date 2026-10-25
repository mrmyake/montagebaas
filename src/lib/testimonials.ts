// Echte reviews van het werk van Ilja Goossens, bron: docs/design/montagebaas-reviews.md
// (opgehaald 25-10-2026 van Google "Montagebaas - TVMuur.com" en Werkspot "Hout & Nieuw",
// zelfde KvK 74579320).
//
// Regels uit dat bestand:
//  - teksten letterlijk, inclusief taalfouten; inkorten alleen met "…";
//  - groep A (keukenmontage) eerst, daarna groep B (algemeen), in de aanbevolen volgorde;
//  - reviews die niet-keukenwerk noemen (cinewall, kast, ombouw, muur, veranda, …) staan hier niet;
//  - A1 (Marlon) wel op de reviewpagina, NIET op de homepage;
//  - cijfers altijd als "4,9 uit 56 reviews op Google en Werkspot", nooit "56 tevreden klanten".

export type TestimonialSource = "werkspot" | "google" | "website";

export type Testimonial = {
  name: string;
  location?: string;
  quote: string;
  rating: number;
  date?: string; // ISO YYYY-MM-DD; Google-reviews hebben in de bron geen datum
  source: TestimonialSource;
  project_type?: string;
};

// ─── Groep A: keukenmontage ──────────────────────────────────────────────────
const A1_MARLON: Testimonial = {
  name: "Marlon",
  quote:
    "We hebben onlangs Ilja ingeschakeld voor het monteren van onze IKEA keuken in L-vorm en man, wat een goede keuze was dat! Vanaf het begin was het duidelijk dat hij echt weet wat hij doet. De instructies van IKEA kunnen soms een puzzel zijn, maar Ilja ging er vlot doorheen. Het installeren van de apparatuur, inclusief een 6-pits SMEG fornuis leek moeiteloos te gaan. En een dikke pluim voor zijn advies over het toevoegen van een extra groep in de groepenkast; dat is het soort vooruitdenken dat we echt waardeerden. Kortom, als je iemand nodig hebt die deskundigheid combineert met een relaxte aanpak, dan is Ilja je go-to. Onze keuken ziet er geweldig uit, en we zijn hem echt dankbaar voor zijn topwerk.",
  rating: 5,
  date: "2023-08-17",
  source: "werkspot",
  project_type: "Montage IKEA-keuken + installatie apparatuur",
};

const A2_STEPHAN: Testimonial = {
  name: "Stephan van den Hoek",
  location: "Nijkerk",
  quote:
    "Fantastische service door Ilja! Hij heeft een kookeiland voor ons geïnstalleerd en het ziet er top uit. Denkt met je mee en gaat voor kwaliteit en een tevreden klant. Top, volgende keer huren wij hem zeker weer in.",
  rating: 5,
  date: "2026-06-18",
  source: "werkspot",
  project_type: "Kookeiland",
};

const A3_KOEN: Testimonial = {
  name: "Koen",
  location: "Nederhorst den Berg",
  quote:
    "Ilja heeft mijn keuken gemonteerd. Het was meten en passen, maar Ilja bleef flexibel en ging door tot het goed was. Zeer tevreden.",
  rating: 5,
  date: "2026-06-30",
  source: "werkspot",
  project_type: "U-vormige keuken",
};

const A4_HOOGLAND: Testimonial = {
  name: "Werkspot-gebruiker",
  location: "Hoogland",
  quote: "Vakwerk!",
  rating: 5,
  date: "2026-07-15",
  source: "werkspot",
  project_type: "Keuken installeren",
};

// ─── Groep B: algemeen over werk en tevredenheid ─────────────────────────────
const B1_MONIQUE: Testimonial = {
  name: "monique rijsdijk",
  quote:
    "Hij is zeer professioneel en werkt erg netjes. betrouwbaar wat ook erg fijn is als je iemand in je huis laat. Wij zijn erg tevreden en krijgen van familie en vrienden ook veel complimenten. Dus kan hem zeker aanbevelen.",
  rating: 5,
  source: "google",
};

const GROEP_B_REST: Testimonial[] = [
  {
    name: "Werkspot-gebruiker",
    location: "Utrecht",
    quote:
      "Ilja komt stipt op tijd, communiceert goed en gaat tot t gaatje om de klus af te maken, ook als het tegenzit. Heel fijn! Zeker een aanrader.",
    rating: 5,
    date: "2023-09-04",
    source: "werkspot",
  },
  {
    name: "Nick",
    location: "Amstelveen",
    quote:
      "Hij heeft onwijs veel kennis en kunde rondom het bouwen en verbouwen van een huis. Hij moest na het bouwen nog iets aanpassen en deed dit zonder te klagen en heeft perfect opgeleverd! Geen moment spijt gehad dat ik hem onze klus heb laten doen. Echt een top bedrijf en kan hem iedereen aanraden!",
    rating: 5,
    date: "2023-10-11",
    source: "werkspot",
  },
  {
    name: "Marjoleine Roosendaal",
    quote:
      "Ilja kwam vlot voor bespreken en inmeten en heeft voortdurend contact gehouden over levering van materialen. Hij werkt vlot en netjes en heeft precies geleverd wat hij heeft toegezegd. Het ziet er prima uit en is volledig wat we wilden. Een aanrader!",
    rating: 5,
    date: "2023-10-03",
    source: "werkspot",
  },
  {
    name: "Claudia Nieste",
    quote:
      "Sympathieke man. Dacht met mij mee. Niets was teveel. Hij en zijn team werkte keihard en superstrak. Dolblij met het resultaat",
    rating: 5,
    source: "google",
  },
  {
    name: "Tjerk",
    location: "Lelystad",
    quote:
      "Ilja verstaat zijn vak. Hij is goed in het on the spot bedenken van hoe het mooiste kan en levert hoge kwaliteit. Hij denkt ook actief mee en is flexibel. Ilja, dank voor je hulp!",
    rating: 5,
    date: "2025-03-17",
    source: "werkspot",
  },
  {
    name: "Werkspot-gebruiker",
    location: "Almere",
    quote:
      "Wat een topper, heeft met gedacht hoe de klus te doen en heeft alles perfect uitgevoerd. Echt een fijne vakman.",
    rating: 5,
    date: "2023-08-28",
    source: "werkspot",
  },
  {
    name: "Werkspot-gebruiker",
    location: "Vleuten",
    quote:
      "Ilja is naast een uitstekende klusjesman ook nog eens een hele fijne vent. Afspraken worden nagekomen en heeft oprecht plezier in dit werk. Wij werden ontzettend uit de brand geholpen! Thanks Ilja 👍",
    rating: 5,
    date: "2023-08-29",
    source: "werkspot",
  },
  {
    name: "Werkspot-gebruiker",
    location: "Voorhout",
    quote:
      "Ilja is een fijne vent die goed mee heeft gedacht en prachtig werk heeft afgeleverd.",
    rating: 5,
    date: "2026-04-08",
    source: "werkspot",
  },
  {
    name: "Damian Napoles",
    quote:
      "Zeer betrouwbare en professioneel service! Erg blij mee met eindresultaat. Absoluut een aanrader.",
    rating: 5,
    source: "google",
  },
  {
    name: "Arthur Beugelink",
    quote: "Vakkundig, aardig en mooie afwerking!",
    rating: 5,
    source: "google",
  },
  {
    name: "Elise",
    quote: "Goede service en goede communicatie.",
    rating: 5,
    date: "2024-02-11",
    source: "werkspot",
  },
  {
    name: "Jordi van Meggelen",
    quote: "Zeer tevreden met het resultaat!",
    rating: 5,
    source: "google",
  },
  {
    name: "LeagueOfizzi",
    quote: "Perfecte service 😊",
    rating: 5,
    source: "google",
  },
];

/** Reviewpagina: eerst groep A, dan groep B, in de aanbevolen volgorde. */
export const TESTIMONIALS: Testimonial[] = [
  A1_MARLON,
  A2_STEPHAN,
  A3_KOEN,
  A4_HOOGLAND,
  B1_MONIQUE,
  ...GROEP_B_REST,
];

/** Homepage (en stadspagina's): A2, A3 en B1, in die volgorde. Nooit A1. */
export const HOMEPAGE_TESTIMONIALS: Testimonial[] = [A2_STEPHAN, A3_KOEN, B1_MONIQUE];

// Cijfers zoals ze op de profielen staan (25-10-2026): Google 5,0 uit 25, Werkspot 4,8 uit 31.
export const REVIEW_AGGREGATES = {
  werkspot: {
    rating: 4.8,
    count: 31,
    profileUrl: "https://www.werkspot.nl/profiel/hout-nieuw/reviews",
  },
  google: {
    rating: 5.0,
    count: 25,
    profileUrl: "https://www.google.com/search?q=Montagebaas+-+TVMuur.com+Loosdrecht",
  },
} as const;

export const TOTAL_REVIEW_COUNT =
  REVIEW_AGGREGATES.werkspot.count + REVIEW_AGGREGATES.google.count; // 56

// Gewogen gemiddelde over beide bronnen, op 1 decimaal (274 sterren / 56 = 4,9).
export const COMBINED_RATING =
  Math.round(
    ((REVIEW_AGGREGATES.werkspot.rating * REVIEW_AGGREGATES.werkspot.count +
      REVIEW_AGGREGATES.google.rating * REVIEW_AGGREGATES.google.count) /
      TOTAL_REVIEW_COUNT) *
      10
  ) / 10;

/** "4,9" (Nederlandse notatie). */
export const cijfer = (n: number) => n.toFixed(1).replace(".", ",");

/** "4,9 uit 56 reviews op Google en Werkspot". */
export const REVIEW_SAMENVATTING = `${cijfer(COMBINED_RATING)} uit ${TOTAL_REVIEW_COUNT} reviews op Google en Werkspot`;
