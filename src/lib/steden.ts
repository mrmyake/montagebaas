/**
 * Stedendata voor de programmatic local SEO-pagina's (/keukenmonteur/[stad]).
 *
 * ⚠️ KRITIEK tegen dunne content: elke `intro` is BEWUST uniek geschreven — andere zinsbouw,
 * andere lokale ankers (wijken, nabije plaatsen, regio). Voeg liever een paar góéd geschreven
 * steden toe dan veel dunne. Voor SSG + sitemap gebruiken we deze statische bron (betrouwbaar,
 * geen build-time DB-afhankelijkheid). De Supabase-tabel `steden` kan dezelfde data spiegelen
 * voor toekomstig gebruik — zie scripts/seed-steden.mjs.
 *
 * EIGENAAR: claim alleen steden waar je daadwerkelijk een monteur hebt (zie aandachtspunt §16).
 */

export interface Stad {
  slug: string;
  naam: string;
  provincie: string;
  /** Eén of meer alinea's, gescheiden door een lege regel. Uniek per stad. */
  intro: string;
  wijken: string[];
  nabij: string[];
  inwoners?: number;
}

export const steden: Stad[] = [
  {
    slug: "amsterdam",
    naam: "Amsterdam",
    provincie: "Noord-Holland",
    inwoners: 905000,
    wijken: ["De Pijp", "Oost", "Noord", "Nieuw-West", "Zuidoost", "Westerpark"],
    nabij: ["Amstelveen", "Diemen", "Zaandam", "Haarlem"],
    intro:
      "In Amsterdam wonen veel mensen op een compacte plattegrond: een smal grachtenpand in de Jordaan vraagt om heel ander montagewerk dan een nieuwbouwappartement in IJburg of Zuidoost. Onze monteurs kennen die verschillen en plaatsen je IKEA-keuken passend, of je nu drie hoog zonder lift woont of een ruime woning in Noord hebt.\n\nWe werken door de hele stad — van De Pijp en Oost tot Nieuw-West — en in de directe omgeving zoals Amstelveen en Diemen. Je krijgt vooraf een vaste prijs en één vast aanspreekpunt, zodat je niet hoeft te wachten op wisselende vakmensen.",
  },
  {
    slug: "rotterdam",
    naam: "Rotterdam",
    provincie: "Zuid-Holland",
    inwoners: 656000,
    wijken: ["Kralingen", "Hillegersberg", "Delfshaven", "Charlois", "Prins Alexander"],
    nabij: ["Schiedam", "Capelle aan den IJssel", "Barendrecht", "Vlaardingen"],
    intro:
      "Rotterdam bouwt en verbouwt volop, en dat zie je terug in de keukens: van strakke lofts in het centrum tot ruime gezinswoningen in Hillegersberg en Prins Alexander. Wij plaatsen je IKEA-keuken vakkundig, inclusief het uitlijnen van fronten en het netjes aansluiten van apparaten.\n\nOnze gescreende monteurs zijn actief in heel Rotterdam en omliggende plaatsen als Schiedam en Capelle aan den IJssel. Vaste prijs vooraf, offerte binnen 24 uur — geen verrassingen achteraf.",
  },
  {
    slug: "den-haag",
    naam: "Den Haag",
    provincie: "Zuid-Holland",
    inwoners: 565000,
    wijken: ["Scheveningen", "Bezuidenhout", "Loosduinen", "Segbroek", "Laak"],
    nabij: ["Rijswijk", "Voorburg", "Wassenaar", "Delft"],
    intro:
      "Den Haag combineert statige herenhuizen met veel naoorlogse appartementen, en allebei stellen ze eigen eisen aan een keukenmontage. Of je nu in Bezuidenhout woont of dichter bij zee in Scheveningen, onze monteurs zorgen voor een keuken die strak en waterpas staat.\n\nWe zijn werkzaam in de hele stad en in randgemeenten zoals Rijswijk en Voorburg. Je hebt één aanspreekpunt van offerte tot oplevering, met een prijs die vooraf vaststaat.",
  },
  {
    slug: "utrecht",
    naam: "Utrecht",
    provincie: "Utrecht",
    inwoners: 361000,
    wijken: ["Lombok", "Wittevrouwen", "Leidsche Rijn", "Overvecht", "Tuindorp"],
    nabij: ["Nieuwegein", "Zeist", "Houten", "Maarssen"],
    intro:
      "Utrecht groeit snel, met veel nieuwbouw in Leidsche Rijn naast de karakteristieke woningen in Lombok en Wittevrouwen. Die mix vraagt om monteurs die zowel een standaard bouwpakket als maatwerk aankunnen — precies waar wij voor staan.\n\nOnze keukenmonteurs werken in heel Utrecht en in de regio, denk aan Nieuwegein, Zeist en Houten. Snel een offerte nodig? Je hebt binnen 24 uur een vaste prijs op maat.",
  },
  {
    slug: "eindhoven",
    naam: "Eindhoven",
    provincie: "Noord-Brabant",
    inwoners: 246000,
    wijken: ["Strijp", "Woensel", "Gestel", "Tongelre", "Stratum"],
    nabij: ["Veldhoven", "Best", "Geldrop", "Nuenen"],
    intro:
      "Als designstad heeft Eindhoven een fijne neus voor strakke, functionele keukens — van de herontwikkelde panden op Strijp-S tot de gezinswijken in Woensel. Wij plaatsen je IKEA-keuken met oog voor detail, zodat het eindresultaat klopt.\n\nWe bedienen heel Eindhoven en omliggende plaatsen zoals Veldhoven, Best en Nuenen. Eén vast aanspreekpunt, een gescreende monteur uit de regio en een vaste prijs vooraf.",
  },
  {
    slug: "groningen",
    naam: "Groningen",
    provincie: "Groningen",
    inwoners: 235000,
    wijken: ["Helpman", "Oosterpark", "Paddepoel", "Beijum", "Schilderswijk"],
    nabij: ["Haren", "Zuidhorn", "Winsum", "Ten Boer"],
    intro:
      "In Groningen wonen veel studenten en starters in compacte woningen, terwijl wijken als Helpman juist ruimere huizen kennen. Onze monteurs passen de aanpak daarop aan en plaatsen je keuken netjes, ook als de ruimte krap is.\n\nWe werken in de stad Groningen en de omliggende dorpen zoals Haren en Winsum. Je ontvangt binnen 24 uur een heldere offerte met een vaste prijs.",
  },
  {
    slug: "tilburg",
    naam: "Tilburg",
    provincie: "Noord-Brabant",
    inwoners: 224000,
    wijken: ["Reeshof", "Oud-Noord", "Berkel-Enschot", "Korvel", "Goirke"],
    nabij: ["Goirle", "Oisterwijk", "Waalwijk", "Loon op Zand"],
    intro:
      "Tilburg heeft met de Reeshof een van de grootste nieuwbouwwijken van het land, naast de oudere buurten in Oud-Noord. Dat betekent veel verschillende keukenopstellingen — recht, hoek of met eiland — en wij plaatsen ze allemaal vakkundig.\n\nOnze gescreende monteurs zijn actief in heel Tilburg en in plaatsen als Goirle en Oisterwijk. Vaste prijs vooraf en één aanspreekpunt, van de eerste vraag tot de laatste kast.",
  },
  {
    slug: "almere",
    naam: "Almere",
    provincie: "Flevoland",
    inwoners: 218000,
    wijken: ["Almere Stad", "Almere Buiten", "Almere Haven", "Almere Poort"],
    nabij: ["Lelystad", "Huizen", "Naarden", "Zeewolde"],
    intro:
      "Almere is een echte nieuwbouwstad: ruime woningen met moderne plattegronden in Almere Stad, Buiten en Poort. Dat maakt het plaatsen van een IKEA-keuken vaak overzichtelijk, maar goede afwerking blijft mensenwerk — daar zorgen onze monteurs voor.\n\nWe werken in alle stadsdelen van Almere en in de regio, waaronder Lelystad en Zeewolde. Binnen 24 uur weet je wat het kost, met een prijs die vaststaat.",
  },
  {
    slug: "breda",
    naam: "Breda",
    provincie: "Noord-Brabant",
    inwoners: 185000,
    wijken: ["Ginneken", "Princenhage", "Haagse Beemden", "Brabantpark"],
    nabij: ["Oosterhout", "Etten-Leur", "Prinsenbeek", "Teteringen"],
    intro:
      "Breda mengt sfeervolle oude buurten als Ginneken en Princenhage met ruimere nieuwbouw in de Haagse Beemden. Of je nu een compacte keuken of een opstelling met eiland wilt, onze monteurs plaatsen het strak en waterpas.\n\nWe zijn werkzaam in heel Breda en in de omgeving, zoals Oosterhout en Etten-Leur. Je krijgt een vaste prijs vooraf en één vast aanspreekpunt gedurende het hele traject.",
  },
  {
    slug: "nijmegen",
    naam: "Nijmegen",
    provincie: "Gelderland",
    inwoners: 179000,
    wijken: ["Nijmegen-Oost", "Lent", "Dukenburg", "Hatert", "Bottendaal"],
    nabij: ["Wijchen", "Beuningen", "Cuijk", "Malden"],
    intro:
      "Nijmegen heeft met de Waalsprong en Lent flink nieuw gebouwd, terwijl Nijmegen-Oost en Bottendaal hun vooroorlogse charme houden. Die verscheidenheid vraagt om monteurs die met elk type woning overweg kunnen — bij ons ben je dan op het juiste adres.\n\nOnze keukenmonteurs werken in heel Nijmegen en in nabije plaatsen als Wijchen en Beuningen. Offerte binnen 24 uur, vaste prijs, geen gedoe.",
  },
  {
    slug: "haarlem",
    naam: "Haarlem",
    provincie: "Noord-Holland",
    inwoners: 162000,
    wijken: ["Schalkwijk", "Haarlem-Noord", "Centrum", "Het Rozenprieel"],
    nabij: ["Heemstede", "Bloemendaal", "Zandvoort", "Velsen"],
    intro:
      "Haarlem staat bekend om zijn monumentale binnenstad, waar keukens vaak in oudere panden met eigenzinnige maten komen. Onze monteurs houden daar rekening mee en zorgen dat je IKEA-keuken ook in een afwijkende ruimte netjes past.\n\nWe werken in heel Haarlem — van het centrum tot Schalkwijk — en in chique buurgemeenten als Heemstede en Bloemendaal. Vaste prijs vooraf en een gescreende vakman uit de regio.",
  },
  {
    slug: "arnhem",
    naam: "Arnhem",
    provincie: "Gelderland",
    inwoners: 165000,
    wijken: ["Spijkerkwartier", "Schuytgraaf", "Presikhaaf", "Klarendal"],
    nabij: ["Velp", "Oosterbeek", "Duiven", "Westervoort"],
    intro:
      "Arnhem loopt van het hippe Klarendal en het Spijkerkwartier tot de ruime nieuwbouw in Schuytgraaf. Wij plaatsen je keuken passend bij de woning, of het nu om een karakteristiek pand of een moderne plattegrond gaat.\n\nOnze monteurs zijn actief in heel Arnhem en in de omgeving, waaronder Velp en Oosterbeek. Binnen 24 uur een offerte met een vaste prijs en één aanspreekpunt.",
  },
  {
    slug: "amersfoort",
    naam: "Amersfoort",
    provincie: "Utrecht",
    inwoners: 161000,
    wijken: ["Vathorst", "Soesterkwartier", "Kruiskamp", "Schothorst"],
    nabij: ["Leusden", "Soest", "Nijkerk", "Bunschoten"],
    intro:
      "Amersfoort combineert een gave middeleeuwse kern met grote nieuwbouwwijken als Vathorst. Daardoor komen we hier zowel krappe keukens in oude huizen als ruime opstellingen in nieuwe woningen tegen — onze monteurs draaien er hun hand niet voor om.\n\nWe werken in heel Amersfoort en in plaatsen als Leusden en Soest. Je krijgt vooraf een vaste prijs en houdt één vast aanspreekpunt tot de oplevering.",
  },
  {
    slug: "zwolle",
    naam: "Zwolle",
    provincie: "Overijssel",
    inwoners: 131000,
    wijken: ["Stadshagen", "Assendorp", "Aa-landen", "Holtenbroek"],
    nabij: ["Kampen", "Hattem", "Heino", "Dalfsen"],
    intro:
      "Zwolle groeit gestaag, met Stadshagen als grote uitbreidingswijk naast gezellige buurten als Assendorp. Wij plaatsen je IKEA-keuken vakkundig, inclusief het aansluiten van apparaten en het monteren van het werkblad.\n\nOnze gescreende monteurs werken in heel Zwolle en in de regio, zoals Kampen en Hattem. Een offerte heb je binnen 24 uur, met een vaste prijs en zonder verrassingen.",
  },
  {
    slug: "leiden",
    naam: "Leiden",
    provincie: "Zuid-Holland",
    inwoners: 127000,
    wijken: ["Roodenburgerdistrict", "Stevenshof", "Merenwijk", "De Kooi"],
    nabij: ["Leiderdorp", "Oegstgeest", "Voorschoten", "Zoeterwoude"],
    intro:
      "Leiden is een echte studentenstad met veel oudere, compacte woningen rond het centrum en ruimere gezinswijken als de Merenwijk en Stevenshof. Onze monteurs weten hoe je ook in een krappe ruimte een keuken netjes en functioneel plaatst.\n\nWe zijn werkzaam in heel Leiden en in omliggende plaatsen als Leiderdorp en Oegstgeest. Vaste prijs vooraf en één aanspreekpunt — overzichtelijk geregeld.",
  },
  {
    slug: "maastricht",
    naam: "Maastricht",
    provincie: "Limburg",
    inwoners: 121000,
    wijken: ["Wyck", "Céramique", "Sint Pieter", "Daalhof", "Heugem"],
    nabij: ["Meerssen", "Valkenburg", "Eijsden", "Margraten"],
    intro:
      "Maastricht heeft een unieke woningvoorraad: van historische panden in Wyck tot de moderne architectuur van Céramique. Dat vraagt soms om creatieve oplossingen bij de montage, en daar zijn onze monteurs op ingespeeld.\n\nWe werken in heel Maastricht en in het Heuvelland, waaronder Valkenburg en Meerssen. Je ontvangt binnen 24 uur een vaste prijs, met één vast aanspreekpunt van begin tot eind.",
  },
];

export const stedenBySlug = new Map(steden.map((s) => [s.slug, s]));
