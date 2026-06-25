// Echte, geverifieerde reviews van Ilja Goossens' vakwerk (Werkspot-profiel
// "hout-en-nieuw" + Google Business). Dezelfde vakman/onderneming als achter
// montagebaas — daarom tonen we ze hier mét hun échte project-label en bron,
// zodat volledig transparant is dat het om timmer-/montagewerk gaat (o.a. IKEA-
// ombouw en cinewalls), niet uitsluitend keukens.
//
// Volgorde: meest keuken-/IKEA-relevante en algemeen-vakmanschap reviews eerst
// (die tonen we in de compacte view op home + stadspagina's), cinewall-specifiek
// daarna. Alle entries zijn al op 5 sterren / echtheid gevalideerd.

export type TestimonialSource = "werkspot" | "google" | "website";

export type Testimonial = {
  name: string;
  location?: string;
  quote: string;
  rating: number;
  date: string; // ISO YYYY-MM-DD
  source: TestimonialSource;
  project_type?: string;
};

export const TESTIMONIALS: Testimonial[] = [
  // ─── Keuken-/kookeiland-montage (meest relevant voor keukenmontage) ─────────
  {
    name: "Stephan van den Hoek",
    location: "Nijkerk",
    quote:
      "Fantastische service door Ilja! Hij heeft een kookeiland voor ons geïnstalleerd en het ziet er top uit. Denkt met je mee en gaat voor kwaliteit en een tevreden klant. Top, volgende keer huren wij hem zeker weer in.",
    rating: 5,
    date: "2026-06-18",
    source: "werkspot",
    project_type: "Kookeiland (de)monteren en plaatsen",
  },
  // ─── IKEA-ombouw + algemeen vakmanschap (meest relevant voor keukenmontage) ─
  {
    name: "Evelien",
    location: "Amstelveen",
    quote:
      "Ilja werkt ontzettend netjes en is een vakman op het gebied van hout. Wij hebben onze Ikea-kasten laten wegwerken met een ombouw. Ilja stemde tussentijds zijn ideeën met ons af. Exact zo geworden als we op hoopten. Heel chique geworden!",
    rating: 5,
    date: "2024-08-22",
    source: "werkspot",
    project_type: "IKEA-kasten ombouw",
  },
  {
    name: "Werkspot-gebruiker",
    location: "Voorhout",
    quote:
      "Ilja is een fijne vent die goed mee heeft gedacht en prachtig werk heeft afgeleverd.",
    rating: 5,
    date: "2026-04-08",
    source: "werkspot",
    project_type: "Ombouw IKEA Besta",
  },
  {
    name: "Tjerk",
    location: "Lelystad",
    quote:
      "Ilja verstaat zijn vak. Hij is goed in het on the spot bedenken van hoe het mooiste kan en levert hoge kwaliteit. Hij denkt ook actief mee en is flexibel. Ilja, dank voor je hulp!",
    rating: 5,
    date: "2025-03-17",
    source: "werkspot",
    project_type: "Maatwerk timmerwerk",
  },
  {
    name: "Alex Ray",
    location: "Amersfoort",
    quote:
      "Wat ik fijn vindt is dat hij meedenkt over ideeën maar ook aan het budget wat je uit wil geven.",
    rating: 5,
    date: "2025-07-28",
    source: "werkspot",
    project_type: "Roomdivider",
  },
  {
    name: "Claudia Nieste",
    quote:
      "Sympathieke man. Dacht met mij mee. Niets was teveel. Hij en zijn team werkte keihard en superstrak. Dolblij met het resultaat.",
    rating: 5,
    date: "2025-09-15",
    source: "google",
    project_type: "Maatwerk montage",
  },
  {
    name: "Nick",
    location: "Amstelveen",
    quote:
      "Hij heeft onwijs veel kennis en kunde rondom het bouwen en verbouwen van een huis. Hij moest na het bouwen nog iets aanpassen en deed dit zonder te klagen en heeft perfect opgeleverd. Echt een top bedrijf!",
    rating: 5,
    date: "2023-10-11",
    source: "werkspot",
    project_type: "Binnenmuren plaatsen",
  },
  {
    name: "Werkspot-gebruiker",
    location: "Hoofddorp",
    quote:
      "Heel fijn geholpen bij ophangen van TV, duidelijke communicatie en klus nauwkeurig uitgevoerd.",
    rating: 5,
    date: "2026-05-12",
    source: "werkspot",
    project_type: "Montage",
  },
  {
    name: "Werkspot-gebruiker",
    location: "Nieuwerkerk aan den IJssel",
    quote:
      "Ilja is een vakman, alsof hij het timmeren al 40 jaar doet. Communicatie verliep vlot en zijn werkmannen hebben netjes gestuct. Als extra pluspunt heeft Ilja goed materiaal en gaat hij netjes te werk: hij legt stuc-loop neer voordat hij te werk gaat.",
    rating: 5,
    date: "2024-08-09",
    source: "werkspot",
    project_type: "Maatwerk timmerwerk",
  },

  // ─── Cinewall-projecten (eerlijk gelabeld) ──────────────────────────────────
  {
    name: "Werkspot-gebruiker",
    location: "Houten",
    quote:
      "Ilja heeft bij ons een prachtige cinewall gebouwd en we zijn ontzettend tevreden met het resultaat. Hij werkt zeer vakkundig en is een professional in wat hij doet. Tot in de puntjes afgewerkt. Wat ook fijn was, is dat Ilja snel werkt en zich perfect aan alle gemaakte afspraken houdt.",
    rating: 5,
    date: "2024-11-10",
    source: "werkspot",
    project_type: "Cinewall met koof",
  },
  {
    name: "Sheila Abdoel",
    location: "Velsen-Noord",
    quote:
      "Donderdag contact gehad met Ilja en vrijdag was hij er om mijn cinewall te bouwen. Wij zijn er super blij mee. We hadden geen omkijken naar de materialen en de klus is keurig uitgevoerd voor een mooi prijsje. Tot de volgende klus!",
    rating: 5,
    date: "2024-09-30",
    source: "werkspot",
    project_type: "Cinewall met koof",
  },
  {
    name: "Ria Ploeg",
    location: "Capelle aan den IJssel",
    quote:
      "Ilja is een vakman eerste klas, denkt mee, komt met oplossingen, werkt zeer secuur. Komt alle toezeggingen na en zelfs meer. Prima prijs! Niet aarzelen, als je een super vakman nodig hebt is Ilja nummer 1.",
    rating: 5,
    date: "2024-07-29",
    source: "werkspot",
    project_type: "Cinewall met koof",
  },
  {
    name: "Annemieke Van B.",
    quote:
      "Door Ilja een dubbelzijdige cinewall laten plaatsen, met aan één zijde 4 ingebouwde kasten (Besta van IKEA). Zoals we gehoopt hadden, is de wand ook geworden: prachtig. Echt een eye catcher in onze woonkamer. Ook de stucadoors waarmee hij samenwerkt, werkten heel netjes.",
    rating: 5,
    date: "2025-05-15",
    source: "google",
    project_type: "Cinewall + IKEA Besta",
  },
  {
    name: "Ana N",
    quote:
      "Superblij met Ilja! Vanaf het eerste moment dacht hij echt met me mee. Hij nam de tijd om mijn wensen te begrijpen en gaf eerlijk en deskundig advies. Het eindresultaat is boven verwachting. Ik heb zijn contactgegevens inmiddels al aan meerdere mensen doorgegeven.",
    rating: 5,
    date: "2025-06-15",
    source: "google",
    project_type: "Cinewall",
  },
  {
    name: "Pauline van Marle",
    quote:
      "Ilja heeft hele mooie maatwerk neergezet. Helemaal naar onze wens. Alles past perfect. Wij zijn er erg blij mee. Ook erg tevreden over het contact: reageert snel, denkt mee, heeft zijn werk in afgesproken tijd af.",
    rating: 5,
    date: "2025-05-15",
    source: "google",
    project_type: "Cinewall",
  },
  {
    name: "M -db",
    quote:
      "Vanaf het eerste contact al een goed gevoel. Ik kon alles vragen en er werd mij alles netjes en vriendelijk uitgelegd. Binnen 3 dagen klaar. Er wordt netjes en secuur gewerkt en de prijs is ook goed. Al met al enorm tevreden.",
    rating: 5,
    date: "2025-04-15",
    source: "google",
    project_type: "Cinewall",
  },
  {
    name: "Wingho",
    quote:
      "Super tevreden over de communicatie, planning en het vakmanschap. Het eindresultaat is echt top geworden. Zeker een aanrader!",
    rating: 5,
    date: "2025-05-15",
    source: "google",
    project_type: "Cinewall",
  },
];

// Aggregaten zoals ze op de profielen staan — de échte, business-brede scores van
// dezelfde onderneming. Werkspot 4.8/5 uit 27, Google 5.0/5 uit 24.
export const REVIEW_AGGREGATES = {
  werkspot: {
    rating: 4.8,
    count: 27,
    profileUrl: "https://www.werkspot.nl/profiel/hout-nieuw/reviews",
  },
  google: { rating: 5.0, count: 24 },
} as const;

export const TOTAL_REVIEW_COUNT =
  REVIEW_AGGREGATES.werkspot.count + REVIEW_AGGREGATES.google.count;

// Gewogen gemiddelde over beide bronnen, op 1 decimaal.
export const COMBINED_RATING =
  Math.round(
    ((REVIEW_AGGREGATES.werkspot.rating * REVIEW_AGGREGATES.werkspot.count +
      REVIEW_AGGREGATES.google.rating * REVIEW_AGGREGATES.google.count) /
      TOTAL_REVIEW_COUNT) *
      10
  ) / 10;
