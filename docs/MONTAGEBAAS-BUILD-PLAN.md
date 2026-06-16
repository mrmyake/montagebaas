# Montagebaas.com — Build Plan voor Claude Code

> **Aan Claude Code:** dit is de complete brief om montagebaas.com te bouwen. Lees eerst dit hele document, bevestig de fasering, en bouw daarna fase voor fase. Vraag door bij onduidelijkheid in plaats van aannames te maken over prijzen of bedrijfsstructuur. Begin pas met code nadat je de relevante design-skill hebt geraadpleegd.

---

## 1. Wat we bouwen en waarom

**Montagebaas.com** is een lead-generation website. Het enige doel is: zoveel mogelijk offerteaanvragen (quote requests) binnenhalen van mensen die in Nederland een keuken willen laten installeren, met **IKEA-keukens als primaire ingang**.

De site moet drie dingen perfect doen, in deze volgorde:
1. **Gevonden worden** (SEO + GEO) door mensen die zoeken naar keukenmontage.
2. **Vertrouwen wekken en informeren** (heldere prijzen, sociale bewijskracht, geen verkooppraat).
3. **Converteren** via een snelle configurator die uitmondt in een offerteaanvraag — **zonder foto-uploads**, dat is bewust om de drempel zo laag mogelijk te houden.

**Eén KPI:** aantal voltooide offerteaanvragen. Elke designkeuze wordt hieraan getoetst.

---

## 2. Tech stack

Gelijk aan de bestaande portfolio-site tvmuur.com:
- **Next.js** (App Router, TypeScript)
- **Supabase** (database voor leads + content-data voor stadspagina's)
- **Vercel** (hosting, deploy)
- **Tailwind CSS** voor styling
- Statische generatie (SSG) waar mogelijk voor SEO en snelheid; alleen het aanvraagformulier is interactief/dynamisch.

Domein: **montagebaas.com** (primair). **dekeukenheld.nl** wijst later naar dezelfde site of dient als NL-specifieke variant — bouw de site domein-agnostisch zodat dit later kan.

---

## 3. Bedrijfsmodel — LEES DIT GOED, het bepaalt de copy

Montagebaas is **geen eenmanszaak en geen anoniem platform**. Het is een netwerkmodel:
- **Wij** (Montagebaas) halen de leads binnen, bepalen de prijs, en bewaken de kwaliteit.
- **Gescreende, zelfstandige keukenmonteurs** voeren de klussen uit, dicht bij de klant.
- De klant heeft **één vast aanspreekpunt** (Montagebaas) van offerte tot oplevering.

**Wat dit betekent voor de copy — vermijd deze twee valkuilen:**
- ❌ Beloof NIET "de baas komt zelf" of impliceer één specifieke monteur. Dat is niet schaalbaar en niet waar.
- ❌ Klink NIET als Werkspot/Klusup (een platform waar je je gegevens achterlaat en daarna door meerdere vakmensen wordt gebeld). Dat is juist onze concurrent.

**Wel de sweet spot ertussenin:**
> "Eén vast aanspreekpunt. Een vakkundige, gescreende monteur uit jouw regio. Vaste prijs vooraf."

We beloven grip, kwaliteit en gemak — niet één gezicht, en geen prijsvechtersveiling.

---

## 4. Positionering & concurrentie

**Kernbelofte (gebruik als rode draad):**
> Je IKEA-keuken vakkundig geplaatst. Vaste prijs vooraf, geen verrassingen, offerte binnen 24 uur. In heel Nederland.

**De pijn die we oplossen:**
- IKEA-keukenkopers zien op tegen zelf monteren (bouwpakket, op maat zagen, frontjes uitlijnen, aansluiten).
- IKEA's eigen montage is duur en ondoorzichtig (starttarief + bedrag per kast + per apparaat + inmeetkosten, plus vaak honderden tot duizenden euro's onaangekondigd "voorbereidend werk").
- IKEA werkt met wisselende externe partners; de klant heeft geen grip en geen vast aanspreekpunt.

**De drie pijlers (voor de "waarom Montagebaas"-sectie):**
1. **Eén vast aanspreekpunt** — geen platform-veiling, geen wisselende partijen. Wij regelen alles.
2. **Vaste prijs vooraf** — geen IKEA-verrassingen achteraf. Wat je ziet, betaal je.
3. **Snel & landelijk** — offerte binnen 24 uur, gescreende monteur uit je eigen regio, planning wanneer het jou uitkomt.

**Concurrentie (context, niet om te noemen op de site):**
- Top van Google = leadplatforms (Werkspot, Klusup, Zoofy, Homedeal) en IKEA zelf. Die verslaan we niet op autoriteit, wél op directheid en gebruikerservaring.
- Directe benchmark = Klus Montagefabriek (één merk, veel reviews, "vaste prijs binnen 24 uur"). Dit niveau van vertrouwen en directheid is de lat.

**Positioneringskeuze:** IKEA als zoekmagneet/ingang, bredere montage als motor. De merknaam "Montagebaas" is bewust breed gehouden voor latere uitbreiding (andere bouwpakketkeukens, losse keukenklussen, op termijn evt. badkamer/meubel) zonder rebrand. **In deze eerste fase ligt de nadruk volledig op (IKEA-)keukens.**

---

## 5. Merk, toon & visuele richting

- **Toon:** nuchter, vakkundig, betrouwbaar, Nederlands-direct. Geen marketingjargon, geen overdreven uitroeptekens. Klinkt als een vakman die zijn zaken op orde heeft.
- **Visueel:** strak, modern, vertrouwenwekkend. Veel witruimte, duidelijke hiërarchie, grote leesbare CTA's. Mobiel-first (het merendeel van deze zoekers zit op de telefoon).
- **Raadpleeg de frontend-design skill** voor de visuele uitwerking — vermijd een templated/generieke look. Kies bewuste, onderscheidende design-tokens (kleur, typografie) die vakmanschap en betrouwbaarheid uitstralen.
- **Referentie:** tvmuur.com voor structuur en conversie-architectuur (hero met social proof → waarom → voor/na → prijsindicatie in tiers → stappenplan → reviews → werkgebied → FAQ → configurator). Volg dat bewezen patroon, maar maak de aanvraag sneller want geen foto's nodig.
- **Logo/merk:** als er nog geen logo is, gebruik een nette tekstlogo "Montagebaas" met een sterk, simpel woordmerk; laat ruimte in de code om later een logobestand te plaatsen.

---

## 6. Sitestructuur (routes)

```
/                          Home / hoofd-landingspagina
/offerte                   Configurator + aanvraagformulier (DE conversiemotor)
/kosten                    "Wat kost een IKEA keuken plaatsen?" — SEO-pijlerpagina
/werkwijze                 Zo werkt het, 4 stappen
/reviews                   Sociale bewijskracht
/werkgebied                Heel NL, overzicht + links naar stadspagina's
/keukenmonteur/[stad]      Geprogrammeerde lokale landingspagina's (zie §9)
/veelgestelde-vragen       FAQ (ook GEO-voer)
/over                      Wie is Montagebaas / het netwerkmodel uitgelegd (vertrouwen)
/bedankt                   Bevestigingspagina na aanvraag (voor conversie-tracking)
```

Globale elementen op elke pagina:
- **Header:** logo, navigatie, prominente "Offerte aanvragen"-knop + telefoonnummer.
- **Sticky mobiele CTA-balk** onderaan: **Bellen | WhatsApp | Offerte** (zoals tvmuur).
- **Footer:** NAW, KvK, contact, navigatie, schema-data.

---

## 7. Data model (Supabase)

**Tabel `aanvragen`** (de leads — dit is het product):
| veld | type | opmerking |
|---|---|---|
| id | uuid (pk) | |
| created_at | timestamp | |
| type_klus | text | bv. "complete_ikea_keuken" |
| aantal_kasten_range | text | bv. "8-15" |
| opstelling | text | recht / hoek / eiland |
| extras | jsonb | array van gekozen extra's |
| prijs_indicatie_min | int | berekende ondergrens (€) |
| prijs_indicatie_max | int | berekende bovengrens (€) |
| postcode | text | alleen postcode, geen volledig adres |
| regio | text | afgeleid uit postcode |
| naam | text | |
| telefoon | text | |
| email | text | |
| gewenste_periode | text | bv. "binnen 2 weken" |
| toelichting | text | optioneel vrij tekstveld |
| status | text | default "nieuw" (voor jouw opvolging) |

**Tabel `steden`** (voor programmatic SEO, zie §9):
| veld | type |
|---|---|
| slug | text (pk), bv. "amsterdam" |
| naam | text, bv. "Amsterdam" |
| provincie | text |
| intro_tekst | text (uniek per stad) |
| wijken | jsonb (lokale ankers) |
| inwoners | int (optioneel, voor context) |

Geen e-mailadressen, betaalgegevens of gevoelige data anders dan contactgegevens van de lead. Zorg voor RLS (row level security) op Supabase zodat alleen jij de leads kunt uitlezen.

**Bij een nieuwe aanvraag:** stuur direct een notificatie (e-mail naar de eigenaar via een Supabase Edge Function of een eenvoudige webhook). De lead mag nooit verloren gaan.

---

## 8. De configurator — DE conversiemotor (`/offerte`)

Dit is het hart van de site. Geïnspireerd op de cinewall-configurator van tvmuur, maar **sneller, want géén foto-upload**. Alles op één pagina, stap voor stap (geen paginawissels — dat verhoogt afhaken).

### Flow

**Stap 1 — Type klus** (radio)
- Complete IKEA-keuken plaatsen
- Andere bouwpakketkeuken plaatsen
- Alleen afmonteren (deels gestart)
- Losse klus (werkblad / kraan / kookplaat / etc.)

**Stap 2 — Grootte** (de belangrijkste prijsdrijver)
- Aantal kasten (onder + boven samen), als keuze: `<8` / `8–15` / `15+`
- Opstelling: recht / hoek / eiland

**Stap 3 — Extra's** (checkboxes, elk met prijsimpact)
- Oude keuken demonteren + afvoeren
- Apparaten aansluiten (met aantal-stepper)
- Werkblad monteren
- Spoelbak/kraan aansluiten
- Lichte leidingaanpassing
- Tegelwerk/spatwand (markeer als "op aanvraag" — partner/maatwerk)

**Stap 4 — Locatie**
- Postcode (alleen postcode, geen volledig adres → lagere drempel). Leid hieruit de regio af.

**Stap 5 — Directe prijsindicatie**
- Toon een **range**, nooit één hard bedrag. Bv: *"Jouw keuken kost naar schatting €1.400 – €1.900, inclusief montage."*
- Korte disclaimer: *"Dit is een indicatie. Je ontvangt binnen 24 uur een exacte offerte op maat."*
- Directe doorgang naar stap 6 (geen aparte pagina).

**Stap 6 — Aanvraag (de conversie)**
- Velden: naam, telefoon, e-mail, gewenste periode (dropdown: zo snel mogelijk / binnen 2 weken / binnen een maand / later/flexibel), optioneel toelichtingsveld.
- **GEEN foto-upload.**
- Eén grote knop: "Vraag mijn offerte aan".
- Na verzturen → redirect naar `/bedankt` met boodschap: *"Je aanvraag is binnen. Je hoort binnen 24 uur van ons."*

### UX-eisen
- Voortgangsindicator (stap x van 6).
- Volgende stap pas actief als de huidige is ingevuld; geen verplichte velden die niet nodig zijn.
- Gehele flow ook op mobiel soepel (grote tikgebieden, geen kleine dropdowns waar het kan).
- State in React (useState/useReducer). Schrijf de lead pas naar Supabase bij definitieve verzending in stap 6.
- Sla bij verzending óók de berekende prijs-range mee op (voor jouw opvolging).

### Prijslogica — implementeer als aanpasbaar config-object

Bouw dit als één centraal config-object zodat de prijzen makkelijk bij te stellen zijn (kalibreer later met echte kostprijzen). Output is **altijd een range** (pas ±15% marge toe op het puntbedrag).

```ts
// pricing.config.ts — voorlopige waarden, kalibreren vóór livegang
export const pricing = {
  basis: {
    // basis montagebedrag per grootteklasse (puntschatting in €)
    "<8":   1250,
    "8-15": 1650,
    "15+":  2300,
  },
  opstellingToeslag: {
    recht: 0,
    hoek:  150,
    eiland: 300,
  },
  extras: {
    demontage_afvoer:        350,  // oude keuken eruit + afvoeren
    apparaat_aansluiten:      75,  // per stuk (x aantal)
    werkblad_monteren:       200,  // standaard werkblad
    spoelbak_kraan:           95,
    lichte_leidingaanpassing:125,  // per punt
    // tegelwerk/spatwand => "op aanvraag", niet in som
  },
  margePct: 0.15, // ± marge voor de getoonde range
};

// Berekening:
// punt = basis[grootte] + opstellingToeslag[opstelling] + som(gekozen extra's)
// min  = round(punt * (1 - margePct))  -> afronden op €50
// max  = round(punt * (1 + margePct))  -> afronden op €50
```

> **Belangrijk voor CC:** deze bedragen zijn een werkbare startschatting op basis van marktdata (IKEA-montage ligt globaal tussen €1.100–€2.500). Laat in de code een duidelijke comment staan dat de eigenaar deze moet kalibreren met echte kostprijzen vóór livegang. Een range die structureel naast de uiteindelijke offerte zit, kost vertrouwen.

---

## 9. Programmatic local SEO — `/keukenmonteur/[stad]`

Dit is het grootste schaalbare SEO-voordeel. Eén template, gevuld met unieke data per stad uit de `steden`-tabel.

**Per stadspagina:**
- H1: "Keukenmonteur [Stad] — IKEA keuken laten plaatsen"
- Unieke intro-tekst per stad (uit DB; minimaal een paar alinea's écht andere tekst, met lokale ankers zoals wijken/regio).
- Regionale prijsindicatie + dezelfde configurator-CTA (knop naar `/offerte`, eventueel met stad voorgevuld).
- Lokale invulling: "werkzaam in [Stad] en omgeving", genoemde wijken/nabije plaatsen.
- Reviews uit die regio indien beschikbaar (anders algemene reviews).
- Schema: `LocalBusiness` met `areaServed` = de stad.

**Start met de 30–40 grootste steden.** Voorbeeld-set: Amsterdam, Rotterdam, Den Haag, Utrecht, Eindhoven, Groningen, Tilburg, Almere, Breda, Nijmegen, Apeldoorn, Haarlem, Arnhem, Enschede, Amersfoort, Zaanstad, 's-Hertogenbosch, Haarlemmermeer, Zwolle, Leiden, Maastricht, Dordrecht, Ede, Leeuwarden, Alkmaar, Emmen, Delft, Venlo, Deventer, Helmond, Oss, Hengelo, Hilversum, Heerlen, Amstelveen, Roosendaal, Purmerend, Schiedam, Lelystad, Gouda.

> ⚠️ **Kritieke waarschuwing tegen dunne content:** de stadspagina's mogen NIET louter copy-paste zijn met alleen de stadsnaam vervangen. Google straft dunne/duplicate content af. Genereer per stad echte variatie in de intro-tekst (andere zinsbouw, lokale ankers, regiospecifieke context). Bouw de `steden`-tabel zo dat de intro-tekst per stad uniek is. Als data ontbreekt: lever liever 15 goede pagina's dan 40 dunne.

**Werkgebied-pagina (`/werkgebied`):** kaart of lijst van NL met links naar alle stadspagina's; communiceert "heel Nederland" en voedt interne linking.

---

## 10. Technische SEO (checklist voor CC)

- **Schema.org / JSON-LD** op de juiste pagina's:
  - `LocalBusiness` (globaal, met NAW/KvK) + `Service` (keukenmontage).
  - `FAQPage` op de FAQ-pagina (en evt. FAQ-blokken elders).
  - `AggregateRating` zodra er echte reviews zijn (→ sterren in Google). Gebruik dit alleen met echte, verifieerbare reviews.
  - Per stadspagina: `LocalBusiness` met `areaServed`.
- **Meta:** unieke title + description per pagina; stadspagina's met stad in title.
- **Open Graph + Twitter cards** (zoals tvmuur als template).
- **Sitemap.xml** automatisch gegenereerd (inclusief alle stadspagina's), **robots.txt** correct.
- **Core Web Vitals:** Next.js `<Image>`, SSG, lazy loading, minimale JS op contentpagina's. Streef naar groene Lighthouse-scores.
- **Schone, semantische HTML** (één H1 per pagina, logische heading-structuur).
- **Interne links:** home → kosten/werkwijze/werkgebied → stadspagina's → offerte. Elke pagina leidt naar de configurator.
- **Canonical tags** correct, vooral op stadspagina's.

**Primaire zoekwoorden om op te optimaliseren** (hoge koopintentie):
- ikea keuken plaatsen / ikea keuken laten plaatsen / ikea keuken monteren
- keukenmonteur / keukenmonteur [stad]
- keuken laten plaatsen / keuken laten installeren

Secundair (informatie → conversie): wat kost een keuken plaatsen, keuken montage kosten, ikea keuken zelf plaatsen of laten doen.

---

## 11. GEO — gevonden worden door AI (ChatGPT, Google AI Overviews, Gemini)

Steeds meer mensen vragen een AI "wie kan mijn IKEA-keuken plaatsen" of "wat kost dat". Optimaliseer content zodat AI's Montagebaas citeren:

- **Directe, citeerbare antwoorden** op `/kosten` en in de FAQ: korte, feitelijke zinnen met een getal. Bv: *"Een IKEA-keuken laten plaatsen kost in Nederland doorgaans €1.100 tot €2.500 voor de montage, exclusief leidingwerk."* AI's pakken dit soort zinnen letterlijk op.
- **FAQPage-schema** maakt antwoorden machine-leesbaar → hogere kans op opname in AI Overviews.
- **Prijstabellen als echte HTML-tabel** (geen afbeelding) → makkelijk te lezen en te citeren door AI.
- **Entiteit-duidelijkheid:** overal glashelder WIE (Montagebaas), WAT (keukenmontage), WAAR (heel NL, netwerk van monteurs). Consistente bedrijfsnaam + NAW op de site, Google Business Profiel en eventuele platformprofielen → AI's vertrouwen de entiteit.
- **Afwegingscontent:** een sectie/pagina "IKEA keuken zelf plaatsen of laten doen?" — exact het soort vraag dat mensen aan AI stellen. Eerlijk, feitelijk, met Montagebaas als logische uitkomst.

---

## 12. Content die geschreven moet worden

CC mag deze teksten schrijven (Nederlands, in de toon uit §5), maar markeer alles wat de eigenaar moet verifiëren (echte reviews, exacte prijzen, KvK-nummer, telefoonnummer).

**`/kosten` (SEO + GEO-pijler):**
- H1 + citeerbare openingszin met prijsrange.
- HTML-prijstabel (kleine / gemiddelde / grote keuken + losse posten).
- Uitleg waaruit de prijs is opgebouwd; eerlijk over wat wel/niet inbegrepen is.
- Vergelijking met IKEA's eigen ondoorzichtige tarieven (feitelijk, niet badmouthing).
- Sectie "Zelf plaatsen of laten doen?" (GEO).
- CTA naar configurator.

**`/veelgestelde-vragen` (FAQ, met FAQPage-schema):** elk antwoord kort, feitelijk, één citeerbare openingszin.
- Wat kost het om een IKEA-keuken te laten plaatsen?
- Hoe snel kunnen jullie komen?
- Werken jullie in heel Nederland?
- Plaatsen jullie ook niet-IKEA keukens?
- Demonteren jullie ook de oude keuken?
- Sluiten jullie ook apparaten en de kraan aan?
- Is de prijs vast of komen er kosten bij?
- Hoelang duurt het plaatsen van een keuken?
- Wie voert de montage uit? (→ leg het netwerkmodel eerlijk uit: gescreende monteurs, één aanspreekpunt)

**`/werkwijze`:** 4 stappen — (1) Aanvraag via configurator → (2) Exacte offerte binnen 24 uur → (3) Inplannen wanneer het jou uitkomt → (4) Vakkundige montage door een gescreende monteur.

**`/over`:** leg het netwerkmodel uit als sterk punt — Montagebaas verbindt klanten met gescreende monteurs, bewaakt prijs en kwaliteit, en is het vaste aanspreekpunt. Bouwt vertrouwen.

---

## 13. Conversie-elementen (overal)

- **Sticky mobiele balk:** Bellen | WhatsApp | Offerte (WhatsApp als `https://wa.me/<nummer>`-deeplink).
- **"Offerte binnen 24 uur"** als terugkerende belofte (hero, werkwijze, configurator, footer).
- **Reviews/sterren** prominent zodra echt beschikbaar (placeholder-component bouwen die later met echte data vult).
- **Vaste-prijs-garantie** als geruststelling tegenover IKEA-verrassingen.
- **Meerdere CTA's naar `/offerte`** verspreid over elke pagina, maar zonder spammerig te worden.
- Telefoonnummer klikbaar (`tel:`) overal in de header.

---

## 14. Build-volgorde (fasen) met acceptatiecriteria

Bouw in deze volgorde. Lever per fase werkende, deploybare code op.

**Fase 0 — Fundament**
- Next.js + TypeScript + Tailwind project; Supabase-project gekoppeld; Vercel-deploy werkend.
- Tabellen `aanvragen` en `steden` aangemaakt met RLS.
- Globale layout: header, footer, sticky mobiele CTA-balk.
- ✅ Klaar als: lege site deployt op Vercel en de DB-tabellen bestaan.

**Fase 1 — De conversiemotor (`/offerte`)** ← hoogste prioriteit
- Volledige configurator-flow (§8) met werkende prijslogica als config-object.
- Verzending schrijft naar Supabase + notificatie naar eigenaar + redirect naar `/bedankt`.
- ✅ Klaar als: een testaanvraag een correcte prijs-range toont, in de DB belandt en een notificatie triggert.

**Fase 2 — Homepage**
- Alle secties (§5-referentie): hero → waarom (3 pijlers) → voor/na of projectplaceholders → prijsindicatie-teaser (3 scenario's) → werkwijze → reviews → werkgebied → FAQ-teaser → slot-CTA.
- ✅ Klaar als: homepage compleet, mobiel-first, alle CTA's leiden naar `/offerte`.

**Fase 3 — Contentpagina's + SEO-basis**
- `/kosten`, `/werkwijze`, `/veelgestelde-vragen`, `/over`, `/reviews`.
- Schema.org (LocalBusiness, Service, FAQPage), meta, OG-tags, sitemap, robots.
- ✅ Klaar als: Lighthouse SEO groen, schema valideert in de Rich Results Test.

**Fase 4 — Programmatic stadspagina's**
- `/keukenmonteur/[stad]`-template + `/werkgebied`-overzicht.
- `steden`-tabel gevuld met (te beginnen) 15-40 steden met UNIEKE intro-teksten.
- Stadspagina's in sitemap.
- ✅ Klaar als: minstens 15 stadspagina's live met unieke content en correcte LocalBusiness-schema.

**Fase 5 — Polish & conversie-optimalisatie**
- Core Web Vitals finetunen, WhatsApp-deeplink, reviews-component klaar voor echte data, conversie-tracking op `/bedankt` (voorbereiding voor Google Ads/Analytics).
- ✅ Klaar als: alle Lighthouse-scores groen en de hele funnel mobiel soepel loopt.

---

## 15. Buiten scope voor deze eerste versie (MVP)

Niet bouwen in fase 1-5, wel architectureel mogelijk laten:
- Foto-uploads in de aanvraag (bewust weggelaten — dit is een feature, geen omissie).
- Online betalen / boeken.
- Klantaccounts / login.
- Monteur-dashboard of -aanmelding (later, als het netwerk groeit).
- dekeukenheld.nl als aparte variant (eerst montagebaas.com staand krijgen).
- Blog/contentmarketing (later voor SEO-uitbreiding).

---

## 16. Aandachtspunten (eerlijk, vóór livegang regelen)

1. **Kalibreer de prijslogica** met echte kostprijzen voordat de site live gaat. De getallen in §8 zijn marktschattingen, geen vaste tarieven.
2. **Reviews zijn de bottleneck, niet de site.** In deze markt koopt vertrouwen. Zonder echte reviews is de site een mooie lege huls. Plan vanaf klant 1 een reviewverzoek in (Google Business). Gebruik nooit nep-reviews of nep-AggregateRating-schema — dat is misleidend en riskant voor SEO.
3. **"Heel Nederland" moet waargemaakt worden.** Het netwerkmodel lost dit op, maar claim alleen dekking waar je daadwerkelijk een monteur hebt. Overweeg stadspagina's gefaseerd live te zetten naarmate regio's gedekt zijn.
4. **Echte bedrijfsgegevens invullen:** KvK-nummer, telefoonnummer, WhatsApp-nummer, e-mail voor lead-notificaties. CC moet hiervoor placeholders zetten die de eigenaar invult.
5. **AVG/privacy:** de site verzamelt persoonsgegevens (leads). Zorg voor een privacyverklaring en correcte verwerking; RLS op Supabase aan.

---

*Einde brief. Claude Code: bevestig dat je de fasering helder hebt, raadpleeg de frontend-design skill, en begin met Fase 0.*
