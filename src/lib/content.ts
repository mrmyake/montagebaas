import type { Extras, Grootte, Opstelling } from "@/lib/pricing";

/** De drie pijlers — "waarom Montagebaas". */
export const pijlers = [
  {
    titel: "Eén vast aanspreekpunt",
    tekst:
      "Geen platform-veiling en geen wisselende partijen. Wij regelen alles van offerte tot oplevering — jij hebt één contact dat je keuken kent.",
  },
  {
    titel: "Vaste prijs vooraf",
    tekst:
      "Geen IKEA-verrassingen achteraf. Je krijgt een heldere offerte op maat. Wat je ziet, betaal je.",
  },
  {
    titel: "Snel & landelijk",
    tekst:
      "Offerte binnen 24 uur, een gescreende monteur uit je eigen regio, en planning wanneer het jou uitkomt. In heel Nederland.",
  },
] as const;

/** Werkwijze in 4 stappen. */
export const stappen = [
  {
    nummer: 1,
    titel: "Aanvraag via de configurator",
    tekst: "Beantwoord een paar korte vragen. Geen foto's nodig — je ziet meteen een prijsindicatie.",
  },
  {
    nummer: 2,
    titel: "Exacte offerte binnen 24 uur",
    tekst: "Wij sturen je een vaste prijs op maat. Helder en zonder verrassingen.",
  },
  {
    nummer: 3,
    titel: "Inplannen wanneer het jou uitkomt",
    tekst: "Akkoord? Dan plannen we de montage op een moment dat jou past.",
  },
  {
    nummer: 4,
    titel: "Vakkundige montage",
    tekst: "Een gescreende monteur uit jouw regio plaatst je keuken netjes en compleet.",
  },
] as const;

/** Prijsscenario's voor de homepage-teaser (ranges worden live berekend uit pricing). */
export const prijsScenarios: {
  label: string;
  omschrijving: string;
  grootte: Grootte;
  opstelling: Opstelling;
  extras: Extras;
}[] = [
  {
    label: "Kleine keuken",
    omschrijving: "Tot 8 kasten, rechte opstelling, apparaten aansluiten",
    grootte: "<8",
    opstelling: "recht",
    extras: { apparaat_aansluiten: true, apparaat_aantal: 2, spoelbak_kraan: true },
  },
  {
    label: "Gemiddelde keuken",
    omschrijving: "8–15 kasten, hoekopstelling, oude keuken eruit + apparaten + werkblad",
    grootte: "8-15",
    opstelling: "hoek",
    extras: {
      demontage_afvoer: true,
      apparaat_aansluiten: true,
      apparaat_aantal: 3,
      werkblad_monteren: true,
      spoelbak_kraan: true,
    },
  },
  {
    label: "Grote keuken",
    omschrijving: "15+ kasten met kookeiland, compleet inclusief demontage en aansluiten",
    grootte: "15+",
    opstelling: "eiland",
    extras: {
      demontage_afvoer: true,
      apparaat_aansluiten: true,
      apparaat_aantal: 4,
      werkblad_monteren: true,
      spoelbak_kraan: true,
      lichte_leidingaanpassing: true,
    },
  },
];

/** FAQ — gedeeld door homepage-teaser en /veelgestelde-vragen (met FAQPage-schema). */
export const faqItems = [
  {
    vraag: "Wat kost het om een IKEA-keuken te laten plaatsen?",
    antwoord:
      "Een IKEA-keuken laten plaatsen kost in Nederland doorgaans €1.100 tot €2.500 voor de montage, exclusief leidingwerk. De exacte prijs hangt af van het aantal kasten, de opstelling en extra's zoals het aansluiten van apparaten of het afvoeren van je oude keuken. Via onze configurator zie je in een minuut een indicatie.",
  },
  {
    vraag: "Hoe snel kunnen jullie komen?",
    antwoord:
      "Je ontvangt binnen 24 uur een offerte. Na akkoord plannen we de montage op een moment dat jou uitkomt — vaak binnen één tot twee weken, afhankelijk van je regio en planning.",
  },
  {
    vraag: "Werken jullie in heel Nederland?",
    antwoord:
      "Ja. Via ons netwerk van gescreende, zelfstandige monteurs werken we door heel Nederland. Je krijgt een vakman uit je eigen regio, met Montagebaas als vast aanspreekpunt.",
  },
  {
    vraag: "Plaatsen jullie ook niet-IKEA keukens?",
    antwoord:
      "Ja. We zijn gespecialiseerd in IKEA-keukens, maar plaatsen ook andere bouwpakketkeukens. Geef bij je aanvraag aan om wat voor keuken het gaat.",
  },
  {
    vraag: "Demonteren jullie ook de oude keuken?",
    antwoord:
      "Ja, dat kan. Het demonteren én afvoeren van je oude keuken kun je als extra optie toevoegen in de configurator, zodat het meteen in je prijs is meegenomen.",
  },
  {
    vraag: "Sluiten jullie ook apparaten en de kraan aan?",
    antwoord:
      "Ja. Het aansluiten van apparaten (oven, kookplaat, vaatwasser, koelkast) en het aansluiten van spoelbak en kraan kun je als extra kiezen. Lichte leidingaanpassingen doen we ook; groter leidingwerk gaat in overleg.",
  },
  {
    vraag: "Is de prijs vast of komen er kosten bij?",
    antwoord:
      "Je krijgt vooraf een vaste prijs op maat. Geen verrassingen achteraf, zolang de situatie overeenkomt met je aanvraag. Maatwerk zoals tegelwerk benoemen we apart in de offerte.",
  },
  {
    vraag: "Hoelang duurt het plaatsen van een keuken?",
    antwoord:
      "De meeste keukens plaatsen we in één tot twee werkdagen. Grotere keukens met kookeiland of extra werk kunnen iets langer duren. In je offerte staat een inschatting.",
  },
  {
    vraag: "Wie voert de montage uit?",
    antwoord:
      "De montage wordt uitgevoerd door een gescreende, zelfstandige keukenmonteur uit jouw regio. Montagebaas selecteert de monteurs, bewaakt de prijs en kwaliteit, en is je vaste aanspreekpunt van offerte tot oplevering.",
  },
] as const;
