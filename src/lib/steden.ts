/**
 * Stedendata voor de programmatic local SEO-pagina's (/keukenmonteur/[stad]).
 *
 * ⚠️ KRITIEK tegen dunne content: elke `intro` is BEWUST uniek geschreven, met andere zinsbouw
 * en andere lokale ankers (wijken, nabije plaatsen, regio). Voeg liever een paar goed geschreven
 * steden toe dan veel dunne. Voor SSG + sitemap gebruiken we deze statische bron (betrouwbaar,
 * geen build-time DB-afhankelijkheid). De Supabase-tabel `steden` kan dezelfde data spiegelen
 * voor toekomstig gebruik, zie scripts/seed-steden.mjs.
 *
 * Werkgebied: Ilja plaatst de keukens zelf, tot ongeveer 75 km rond Loosdrecht.
 * `binnenStraal: false` = de pagina blijft bestaan (URL's mogen niet verdwijnen), maar belooft
 * geen werk ter plaatse; de intro en de pagina vragen de bezoeker even te bellen of te appen.
 */

import { site } from "@/lib/site";

export interface Stad {
  slug: string;
  naam: string;
  provincie: string;
  /** Binnen het werkgebied (tot ongeveer 75 km rond Loosdrecht). */
  binnenStraal: boolean;
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
    binnenStraal: true,
    inwoners: 905000,
    wijken: ["De Pijp", "Oost", "Noord", "Nieuw-West", "Zuidoost", "Westerpark"],
    nabij: ["Amstelveen", "Diemen", "Zaandam", "Haarlem"],
    intro:
      "In Amsterdam wonen veel mensen op een compacte plattegrond. Een smal grachtenpand in de Jordaan vraagt om heel ander montagewerk dan een nieuwbouwappartement op IJburg of in Zuidoost. Ilja kent die verschillen en plaatst je IKEA-keuken passend, ook als je drie hoog zonder lift woont.\n\nVanuit Loosdrecht is hij snel in de stad, van De Pijp en Oost tot Nieuw-West en Noord, en in Amstelveen en Diemen. Je spreekt vooraf een vaste prijs af. Let op: parkeerkosten in Amsterdam zitten niet in de prijs.",
  },
  {
    slug: "rotterdam",
    naam: "Rotterdam",
    provincie: "Zuid-Holland",
    binnenStraal: true,
    inwoners: 656000,
    wijken: ["Kralingen", "Hillegersberg", "Delfshaven", "Charlois", "Prins Alexander"],
    nabij: ["Schiedam", "Capelle aan den IJssel", "Barendrecht", "Vlaardingen"],
    intro:
      "Rotterdam bouwt en verbouwt volop, en dat zie je terug in de keukens. Strakke lofts in het centrum, ruime gezinswoningen in Hillegersberg en Prins Alexander, oudere bovenwoningen in Delfshaven. Ilja plaatst je IKEA-keuken waterpas, lijnt de fronten uit en sluit alles netjes aan.\n\nRotterdam ligt aan de rand van ons werkgebied. Ook Schiedam en Capelle aan den IJssel liggen binnen bereik. Je krijgt binnen 24 uur een offerte met een vaste prijs.",
  },
  {
    slug: "den-haag",
    naam: "Den Haag",
    provincie: "Zuid-Holland",
    binnenStraal: true,
    inwoners: 565000,
    wijken: ["Scheveningen", "Bezuidenhout", "Loosduinen", "Segbroek", "Laak"],
    nabij: ["Rijswijk", "Voorburg", "Wassenaar", "Delft"],
    intro:
      "Den Haag combineert statige herenhuizen met veel naoorlogse flats. Allebei stellen ze eigen eisen aan een keukenmontage: scheve vloeren in Bezuidenhout, smalle trappenhuizen in Laak. Ilja zorgt dat je keuken strak en waterpas staat, of je nu in Segbroek woont of vlak bij zee in Scheveningen.\n\nDen Haag valt binnen ons werkgebied, net als Rijswijk en Voorburg. Je hebt één aanspreekpunt van offerte tot oplevering, en dat is ook degene die de keuken plaatst.",
  },
  {
    slug: "utrecht",
    naam: "Utrecht",
    provincie: "Utrecht",
    binnenStraal: true,
    inwoners: 361000,
    wijken: ["Lombok", "Wittevrouwen", "Leidsche Rijn", "Overvecht", "Tuindorp"],
    nabij: ["Nieuwegein", "Zeist", "Houten", "Maarssen"],
    intro:
      "Utrecht groeit snel. In Leidsche Rijn staat veel nieuwbouw, terwijl Lombok en Wittevrouwen vol karakteristieke oude woningen zitten. Die mix vraagt om iemand die zowel een standaard bouwpakket als een lastige nis aankan.\n\nUtrecht ligt op een half uur van Loosdrecht en hoort bij ons vaste werkgebied, net als Maarssen, Zeist, Nieuwegein en Houten. Je hebt binnen 24 uur een vaste prijs op maat.",
  },
  {
    slug: "eindhoven",
    naam: "Eindhoven",
    provincie: "Noord-Brabant",
    binnenStraal: false,
    inwoners: 246000,
    wijken: ["Strijp", "Woensel", "Gestel", "Tongelre", "Stratum"],
    nabij: ["Veldhoven", "Best", "Geldrop", "Nuenen"],
    intro:
      `Eindhoven is een designstad met een neus voor strakke, functionele keukens, van de herontwikkelde panden op Strijp-S tot de gezinswijken in Woensel. Toch ligt Eindhoven buiten ons vaste werkgebied.\n\n${site.naam} is een eenmanszaak: Ilja plaatst elke keuken zelf. Hij werkt tot ongeveer 75 km rond Loosdrecht. Woon je in Eindhoven, Veldhoven of Best? Bel of app dan even, dan kijken we samen of het past.`,
  },
  {
    slug: "groningen",
    naam: "Groningen",
    provincie: "Groningen",
    binnenStraal: false,
    inwoners: 235000,
    wijken: ["Helpman", "Oosterpark", "Paddepoel", "Beijum", "Schilderswijk"],
    nabij: ["Haren", "Zuidhorn", "Winsum", "Ten Boer"],
    intro:
      "In Groningen wonen veel studenten en starters in compacte woningen, terwijl Helpman juist ruimere huizen kent. Voor een keuken in het noorden moeten we eerlijk zijn: Groningen ligt ver buiten ons vaste werkgebied.\n\nIlja plaatst de keukens zelf en werkt tot ongeveer 75 km rond Loosdrecht. Gaat het om een grotere klus of ben je flexibel met de planning? Bel of app even, dan kijken we of het past.",
  },
  {
    slug: "tilburg",
    naam: "Tilburg",
    provincie: "Noord-Brabant",
    binnenStraal: false,
    inwoners: 224000,
    wijken: ["Reeshof", "Oud-Noord", "Berkel-Enschot", "Korvel", "Goirke"],
    nabij: ["Goirle", "Oisterwijk", "Waalwijk", "Loon op Zand"],
    intro:
      "Tilburg heeft met de Reeshof een van de grootste nieuwbouwwijken van het land, naast de oudere buurten in Oud-Noord en Korvel. Rechte keukens, hoekopstellingen en eilanden: ze komen er allemaal voor.\n\nTilburg valt buiten het gebied waar we standaard werken. Ilja plaatst je keuken zelf en rijdt tot ongeveer 75 km rond Loosdrecht. Woon je in Tilburg, Goirle of Oisterwijk? Neem even contact op, dan bespreken we of het haalbaar is.",
  },
  {
    slug: "almere",
    naam: "Almere",
    provincie: "Flevoland",
    binnenStraal: true,
    inwoners: 218000,
    wijken: ["Almere Stad", "Almere Buiten", "Almere Haven", "Almere Poort"],
    nabij: ["Lelystad", "Huizen", "Naarden", "Zeewolde"],
    intro:
      "Almere is een echte nieuwbouwstad, met ruime woningen en moderne plattegronden in Almere Stad, Buiten en Poort. Dat maakt het plaatsen van een IKEA-keuken vaak overzichtelijk. Goede afwerking blijft wel handwerk: kitranden, plinten en fronten die precies gelijk staan.\n\nVanuit Loosdrecht ben je via de Hollandse Brug zo in Almere. Ook Huizen, Naarden en Lelystad vallen binnen ons werkgebied. Binnen 24 uur weet je wat het kost.",
  },
  {
    slug: "breda",
    naam: "Breda",
    provincie: "Noord-Brabant",
    binnenStraal: false,
    inwoners: 185000,
    wijken: ["Ginneken", "Princenhage", "Haagse Beemden", "Brabantpark"],
    nabij: ["Oosterhout", "Etten-Leur", "Prinsenbeek", "Teteringen"],
    intro:
      "Breda mengt sfeervolle oude buurten als Ginneken en Princenhage met ruimere nieuwbouw in de Haagse Beemden. Mooie keukens om te plaatsen, maar Breda ligt buiten ons vaste werkgebied.\n\nWe zijn een eenmanszaak en Ilja doet de montage zelf, tot ongeveer 75 km rond Loosdrecht. Zit je in Breda, Oosterhout of Etten-Leur en wil je toch dat Ilja komt? Bel of app even, dan kijken we of het past in de planning.",
  },
  {
    slug: "nijmegen",
    naam: "Nijmegen",
    provincie: "Gelderland",
    binnenStraal: false,
    inwoners: 179000,
    wijken: ["Nijmegen-Oost", "Lent", "Dukenburg", "Hatert", "Bottendaal"],
    nabij: ["Wijchen", "Beuningen", "Cuijk", "Malden"],
    intro:
      "Nijmegen heeft met de Waalsprong en Lent flink nieuw gebouwd, terwijl Nijmegen-Oost en Bottendaal hun vooroorlogse charme houden. Elk type woning vraagt een andere aanpak bij de montage.\n\nNijmegen ligt net buiten ons vaste werkgebied van ongeveer 75 km rond Loosdrecht. Ilja plaatst de keukens zelf, dus de afstand telt mee. Bel of app even, dan kijken we samen of jouw klus past.",
  },
  {
    slug: "haarlem",
    naam: "Haarlem",
    provincie: "Noord-Holland",
    binnenStraal: true,
    inwoners: 162000,
    wijken: ["Schalkwijk", "Haarlem-Noord", "Centrum", "Het Rozenprieel"],
    nabij: ["Heemstede", "Bloemendaal", "Zandvoort", "Velsen"],
    intro:
      "Haarlem staat bekend om zijn monumentale binnenstad. Keukens komen daar vaak in oudere panden met eigenzinnige maten, waar geen muur helemaal recht is. Ilja houdt daar rekening mee en zorgt dat je IKEA-keuken ook in een afwijkende ruimte netjes past.\n\nHaarlem valt binnen ons werkgebied, van het centrum en het Rozenprieel tot Schalkwijk, en ook Heemstede en Bloemendaal. Je spreekt vooraf een vaste prijs af.",
  },
  {
    slug: "arnhem",
    naam: "Arnhem",
    provincie: "Gelderland",
    binnenStraal: false,
    inwoners: 165000,
    wijken: ["Spijkerkwartier", "Schuytgraaf", "Presikhaaf", "Klarendal"],
    nabij: ["Velp", "Oosterbeek", "Duiven", "Westervoort"],
    intro:
      "Arnhem loopt van het levendige Klarendal en het Spijkerkwartier tot de ruime nieuwbouw in Schuytgraaf. Karakteristieke panden en moderne plattegronden liggen er dicht bij elkaar.\n\nArnhem ligt op de grens van wat we doen. Ons vaste werkgebied is ongeveer 75 km rond Loosdrecht en Ilja plaatst elke keuken zelf. Woon je in Arnhem, Velp of Oosterbeek? Bel of app even, dan kijken we of het past.",
  },
  {
    slug: "amersfoort",
    naam: "Amersfoort",
    provincie: "Utrecht",
    binnenStraal: true,
    inwoners: 161000,
    wijken: ["Vathorst", "Soesterkwartier", "Kruiskamp", "Schothorst"],
    nabij: ["Leusden", "Soest", "Nijkerk", "Bunschoten"],
    intro:
      "Amersfoort combineert een middeleeuwse kern met grote nieuwbouwwijken als Vathorst. Daardoor kom je hier zowel krappe keukens in oude huizen in het Soesterkwartier tegen als ruime opstellingen met eiland in Schothorst.\n\nAmersfoort ligt op twintig minuten van Loosdrecht en is vast werkgebied, net als Soest, Leusden en Nijkerk. Je krijgt vooraf een vaste prijs, en Ilja is van offerte tot oplevering je aanspreekpunt.",
  },
  {
    slug: "zwolle",
    naam: "Zwolle",
    provincie: "Overijssel",
    binnenStraal: false,
    inwoners: 131000,
    wijken: ["Stadshagen", "Assendorp", "Aa-landen", "Holtenbroek"],
    nabij: ["Kampen", "Hattem", "Heino", "Dalfsen"],
    intro:
      "Zwolle groeit gestaag, met Stadshagen als grote uitbreidingswijk naast gezellige buurten als Assendorp. Een mooie stad voor een nieuwe keuken, maar wel buiten ons vaste werkgebied.\n\nIlja plaatst de keukens zelf, tot ongeveer 75 km rond Loosdrecht. Zwolle, Kampen en Hattem liggen verder weg. Wil je toch overleggen? Bel of app even, dan kijken we of het past.",
  },
  {
    slug: "leiden",
    naam: "Leiden",
    provincie: "Zuid-Holland",
    binnenStraal: true,
    inwoners: 127000,
    wijken: ["Roodenburgerdistrict", "Stevenshof", "Merenwijk", "De Kooi"],
    nabij: ["Leiderdorp", "Oegstgeest", "Voorschoten", "Zoeterwoude"],
    intro:
      "Leiden is een studentenstad met veel oudere, compacte woningen rond het centrum en ruimere gezinswijken als de Merenwijk en de Stevenshof. In een smal Leids benedenhuis telt elke centimeter, en daar houdt Ilja bij het plaatsen rekening mee.\n\nLeiden valt binnen ons werkgebied, net als Leiderdorp en Oegstgeest. Vaste prijs vooraf en één aanspreekpunt. Overzichtelijk geregeld.",
  },
  {
    slug: "maastricht",
    naam: "Maastricht",
    provincie: "Limburg",
    binnenStraal: false,
    inwoners: 121000,
    wijken: ["Wyck", "Céramique", "Sint Pieter", "Daalhof", "Heugem"],
    nabij: ["Meerssen", "Valkenburg", "Eijsden", "Margraten"],
    intro:
      `Maastricht heeft een bijzondere woningvoorraad, van historische panden in Wyck tot de moderne architectuur van Céramique. Helaas ligt Maastricht ver buiten ons werkgebied.\n\n${site.naam} is een eenmanszaak met Ilja als vakman. Hij werkt tot ongeveer 75 km rond Loosdrecht, en Zuid-Limburg valt daar ruim buiten. Twijfel je? Bel of app even, dan zeggen we eerlijk of het kan.`,
  },
  {
    slug: "hilversum",
    naam: "Hilversum",
    provincie: "Noord-Holland",
    binnenStraal: true,
    inwoners: 92000,
    wijken: ["Kerkelanden", "Hilversumse Meent", "Oostereind", "Trompenberg", "Noordwest"],
    nabij: ["Loosdrecht", "Bussum", "Laren", "Baarn"],
    intro:
      `Hilversum ligt om de hoek van Loosdrecht. ${site.naam} zit op een paar kilometer afstand, dus voor een keuken in Hilversum is hij snel ter plaatse, ook voor een keer extra meten of een kleine nazorgklus.\n\nDe woningen in Hilversum lopen sterk uiteen. In Trompenberg en Noordwest staan ruime villa's en jaren-dertighuizen met hoge plafonds en niet altijd rechte muren. In Kerkelanden en de Hilversumse Meent wonen veel gezinnen in rijtjeshuizen uit de jaren zestig en zeventig, waar de oude keuken vaak voor het eerst vervangen wordt. Ook in Oostereind, Bussum, Laren en Baarn plaatst Ilja je keuken zelf, netjes en compleet.`,
  },
];

export const stedenBySlug = new Map(steden.map((s) => [s.slug, s]));

export const stedenBinnenStraal = steden.filter((s) => s.binnenStraal);
export const stedenBuitenStraal = steden.filter((s) => !s.binnenStraal);
