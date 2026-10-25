import { kostenKaarten, tekstBedragen } from "@/lib/prijs-weergave";

const bedragen = tekstBedragen();

/** De drie pijlers — "waarom Montagebaas". */
export const pijlers = [
  {
    titel: "Eén vast aanspreekpunt",
    tekst:
      "Geen platform-veiling en geen wisselende partijen. Ilja regelt alles van offerte tot oplevering. Jij hebt één contact dat je keuken kent.",
  },
  {
    titel: "Vaste prijs vooraf",
    tekst:
      "Geen IKEA-verrassingen achteraf. Je krijgt een heldere offerte op maat. Wat je ziet, betaal je.",
  },
  {
    titel: "Vakman uit Loosdrecht",
    tekst:
      "Ilja plaatst je keuken zelf, netjes en compleet. Hij werkt tot ongeveer 75 km rond Loosdrecht en je hebt binnen 24 uur een offerte.",
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
    tekst: "Ilja plaatst je keuken zelf, netjes en compleet.",
  },
] as const;

/** Prijsscenario's voor de homepage-teaser. Bedragen komen uit de prijsadapter, nooit letterlijk. */
const kaarten = kostenKaarten();
export const prijsScenarios: { label: string; omschrijving: string; band: string }[] = [
  {
    label: "Kleine keuken",
    omschrijving: "Tot 8 kasten, rechte opstelling. Apparaten, spoelbak en kraan aansluiten inbegrepen.",
    band: kaarten[0].band,
  },
  {
    label: "Gemiddelde keuken",
    omschrijving: "8 tot 15 kasten, L- of U-vorm. Apparaten, spoelbak en kraan aansluiten inbegrepen.",
    band: kaarten[1].band,
  },
  {
    label: "Grote keuken",
    omschrijving: "15 kasten of meer, met kookeiland. Apparaten, spoelbak en kraan aansluiten inbegrepen.",
    band: kaarten[2].band,
  },
];

/** FAQ — gedeeld door homepage-teaser en /veelgestelde-vragen (met FAQPage-schema). */
export const faqItems = [
  {
    vraag: "Wat kost het om een IKEA-keuken te laten plaatsen?",
    antwoord:
      `Een complete montage van een IKEA-keuken kost bij Montagebaas ongeveer ${bedragen.laagsteBand} tot ${bedragen.hoogsteBand}, inclusief btw en reiskosten. Een kleine keuken zit rond ${bedragen.klein}, een gemiddelde rond ${bedragen.gemiddeld} en een grote met eiland rond ${bedragen.groot}. Apparaten, spoelbak en kraan aansluiten zitten daar al in. Je exacte prijs staat in je offerte.`,
  },
  {
    vraag: "Hoe snel kunnen jullie komen?",
    antwoord:
      "Je ontvangt binnen 24 uur een offerte. Na akkoord plannen we de montage op een moment dat jou uitkomt. Vaak lukt dat binnen één tot twee weken, afhankelijk van de planning.",
  },
  {
    vraag: "In welk gebied werken jullie?",
    antwoord:
      "We werken tot ongeveer 75 km rond Loosdrecht. Denk aan Utrecht, Hilversum, Amsterdam, Amersfoort en omgeving. Woon je verder weg? Bel of app even, dan kijken we of het past. Parkeerkosten in Amsterdam zitten niet in de prijs.",
  },
  {
    vraag: "Plaatsen jullie ook niet-IKEA keukens?",
    antwoord:
      "Ja. We zijn gespecialiseerd in IKEA-keukens, maar plaatsen ook andere bouwpakketkeukens. Geef bij je aanvraag aan om wat voor keuken het gaat.",
  },
  {
    vraag: "Demonteren jullie ook de oude keuken?",
    antwoord:
      `Ja, dat kan. Je oude keuken demonteren en afvoeren kost ${bedragen.demontage}, inclusief container. Je kiest het als extra bij je aanvraag, zodat het meteen in je prijs zit.`,
  },
  {
    vraag: "Sluiten jullie ook apparaten en de kraan aan?",
    antwoord:
      "Ja, en dat zit al in de prijs. Oven, kookplaat, vaatwasser en koelkast sluiten we aan, net als de spoelbak en kraan op de bestaande afvoer en water. Lichte leidingaanpassingen doen we ook. Groter leidingwerk gaat in overleg.",
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
      "Ilja Goossens, de eigenaar van Montagebaas. Montagebaas is een eenmanszaak: Ilja maakt je offerte, plaatst je keuken zelf en is je aanspreekpunt van offerte tot oplevering.",
  },
] as const;
