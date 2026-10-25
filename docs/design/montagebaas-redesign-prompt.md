# Opdracht: montagebaas.com ombouwen naar het nieuwe design en de nieuwe intake

## Context

Montagebaas plaatst IKEA METOD-keukens (95% van de aanvragen is IKEA). Ik heb een nieuw ontwerp laten maken onder de werknaam De Keukenheld. Dat merk komt later. Nu bouwen we **montagebaas.com zelf** om naar dit ontwerp en deze functionaliteit, onder de naam Montagebaas. Later wordt De Keukenheld een tweede merkconfig op dezelfde codebase, dus bouw alles merkonafhankelijk.

Ontwerpbronnen (bijgevoegd, zet ze in de repo onder `docs/design/`):
- `PrijsEerstLink.dc.html`: desktop, de leidende versie
- `PrijsEerstLinkMobiel.dc.html`: iPhone-versie (390 px), leidend voor mobiel
- `LogoVinkje.dc.html`: beeldmerk (kastfront met vinkje als greep)

Dit zijn ontwerpbestanden in een eigen templateformaat (`<x-dc>`, `sc-if`, `sc-for`, `{{...}}`). Gebruik ze als visuele en functionele spec, niet als code. Herbouw alles als React-componenten in de bestaande Next.js-app. Teksten, kleuren, typografie, volgorde van secties en stappenlogica neem je over.

Werkwijze: werk zelfstandig door, stop alleen als er echt menselijke authenticatie of goedkeuring nodig is. Meld tegenstrijdigheden met deze opdracht of met wat je in de code aantreft apart en expliciet. Commit ook diagnostische bestanden. Alles eerst naar een Vercel preview, niet naar productie.

## Fase 0: inventarisatie (rapporteer voor je bouwt)

1. Huidige configurator: welke stappen, velden, validatie, uploadlogica en API-route naar Supabase.
2. Huidige prijslogica: welke functie(s) de frontend aanroept voor indicaties en pakketprijzen, en welke bedragen nog hardcoded in componenten staan. Alleen inventariseren, niet wijzigen.
3. Kolommen in `montagebaas.aanvragen`, inclusief attributie (gclid, gbraid, wbraid, UTM, ga_client_id) en hoe de first-party attributiecookie wordt gezet.
4. Hoe GA4 `offerte_aanvraag` op `/bedankt` vuurt en hoe Google Ads-conversies lopen.
5. **Schakel 1 (PDF naar KeukenTelling):** is die vanuit een webrequest aan te roepen, en hoe lang duurt een run? Dit bepaalt hoe de PDF-route werkt (zie fase 3).
6. Bestaande pagina's en URL's (stadspagina's, FAQ, privacy, structured data). Niets daarvan mag verdwijnen.

## Fase 1: prijzen NIET aanraken

Er loopt parallel een aparte PR voor het dagenmodel (Schakel 2, nieuwe rij in `tarieven`, indicatiebanden). Die PR is eigenaar van alle prijslogica. Deze opdracht verandert niets aan:
- Schakel 2 en `berekenPrijsUitTelling`
- `montagebaas.tarieven`
- de feature flag `TOON_PRIJS_BIJ_LINK`

Regels:
- Componenten krijgen elk bedrag (banden, pakketprijzen, extra's) uit de bestaande prijsfunctie(s) of de actieve tarievenrij. **Geen enkel bedrag hardcoded in de frontend.** De bedragen in de mockup zijn voorbeelden.
- Ontbreekt een bedrag in tarieven of Schakel 2 (bv. de vragenroute-banden of een extra), maak dan een dunne adapter met een TODO en meld het. Geen eigen prijslogica bouwen.
- Begin in een eigen worktree vanaf `main`. Rebase op `main` zodra de dagenmodel-PR gemerged is en controleer dat de bon de nieuwe bedragen toont.

## Fase 2: database (additieve migratie, niets verwijderen)

Check eerst welke kolommen de planner-link-build en de dagenmodel-PR al hebben toegevoegd. Voeg alleen toe wat ontbreekt, met een migratie die niet botst met die van de dagenmodel-PR. Voeg toe aan `montagebaas.aanvragen` (alleen als ze nog niet bestaan):
- `route`: enum `link | pdf | vragen`
- `site_versie`: tekst, bv. `v1-oud` en `v2-redesign`. Bestaande rijen krijgen `v1-oud`.
- `pakket_gekozen`: `compleet | montageklaar | null`
- `demontage_gekozen`: boolean
- `prijs_getoond_laag` en `prijs_getoond_hoog`: de exacte indicatie die de klant op het scherm zag (bij een exacte prijs zijn beide gelijk). Hergebruik bestaande kolommen als die dit al vastleggen.
- `planner_link`: tekst, voor de link-route

Werk `lead_overzicht` bij zodat route en site_versie erin staan. Regenereer de TypeScript-types.

## Fase 3: frontend

### Merkconfig
Eén config-object per merk: naam, beeldmerk, accentkleur, telefoon, WhatsApp, e-mail, KvK, werkgebied-tekst. Montagebaas is de eerste en enige actieve config. Selecteer op hostname, zodat De Keukenheld later alleen een config plus domein is.

Montagebaas-config:
- Naam: Montagebaas
- Beeldmerk: het vinkje-kastfront uit `LogoVinkje.dc.html`, met woordmerk "Montagebaas" in Schibsted Grotesk 800
- Accent: `#0F7B6C` (teal). Overige kleuren, fonts (Schibsted Grotesk, IBM Plex Mono) en spacing uit `PrijsEerstLink.dc.html`
- Telefoon en WhatsApp: 06 2917 3468
- KvK: 74579320
- Favicon en app-icoon uit de varianten in `LogoVinkje.dc.html`

### Homepage = configurator
Bouw `PrijsEerstLink.dc.html` na, met `PrijsEerstLinkMobiel.dc.html` als spec voor mobiel (prijs en knop vast onderin beeld, bel- en WhatsApp-knop in de header). Mobiel eerst: ruim 70% van de advertentieaanvragen komt van een iPhone.

Drie routes:
1. **IKEA-link** (standaard): de planner-link-intake staat al live op montagebaas.com. Hergebruik de bestaande Vercel Function, `KeukenTelling`-mapping en meldingen (eilanden, eigen apparaten, onbekende artikelen). Alleen de UI wordt nieuw. Respecteer `TOON_PRIJS_BIJ_LINK`: staat hij uit, toon dan na het lezen wel de chips en de pakketkeuze, maar zonder bedrag ("Je vaste prijs volgt binnen 24 uur"). Staat hij aan, toon de prijs uit Schakel 2.
2. **PDF uploaden**: zelfde uploadregels als nu (PDF, PNG, JPG, max 8 MB per bestand, tot 8 bestanden).
   - Als Schakel 1 snel genoeg synchroon kan draaien (fase 0, punt 5): toon na het lezen de chips en een exacte prijs per pakket.
   - Zo niet: na upload vraag je alleen keukengrootte en opstelling en toon je de band. De upload gaat gewoon mee met de aanvraag.
   - Exacte prijs **alleen bij `vertrouwen: hoog`**. Bij gemiddeld of laag een band. Een te lage exacte prijs is erger dan een band.
3. **Vragen beantwoorden**: klus, keuken (grootte en opstelling), extra's, waar en wanneer, gegevens. Voor niet-IKEA, afmaakklussen en mensen zonder ontwerp.

Ontwerproute: ontwerp, pakket (Compleet of Montageklaar, demontage als vinkje), waar en wanneer (postcode en planning op één scherm), gegevens. Vier stappen.

Als het lezen van link of PDF faalt: melding plus directe overstap naar de vragenroute, zonder dat ingevulde gegevens verloren gaan.

De bon (receipt) rechts op desktop en de vaste balk onderin op mobiel rekenen live mee via de prijsmodule uit fase 1.

### Na verzenden
De mockup toont een inline "Je aanvraag is binnen". **Niet overnemen.** Na verzenden altijd redirect naar `/bedankt`, want daar vuurt de GA4-conversie. Attributievelden, cookie en consent-vinkje ("Google mag meten via welke advertentie je ons vond") werken exact zoals nu.

### Overige secties
Kosten, vergelijking (zelf doen / klusplatform / Montagebaas), werkwijze, reviews, werkgebied, FAQ, eind-CTA, footer, allemaal uit de mockup. Met deze correcties, want de mockup bevat claims die voor Montagebaas niet kloppen:
- **Werkgebied:** niet "Heel Nederland". Tekst: tot ongeveer 75 km rond Loosdrecht (Utrecht, Hilversum, Amsterdam, Amersfoort en omgeving). Stedenlijst alleen met plaatsen binnen die straal. Bestaande stadspagina's behouden.
- **Werkwijze stap 4 en werkgebied:** geen "gescreende monteur uit jouw regio". Ilja plaatst zelf. Bv. "Ilja plaatst je keuken zelf, netjes en compleet."
- **Reviews:** gebruik `docs/design/montagebaas-reviews.md` (bijgevoegd). Cijfers: 4,9 uit 56 reviews (Google 5,0 uit 25, Werkspot 4,8 uit 31). Quotes alleen uit dat bestand, letterlijk en in de daar aangegeven volgorde. Homepage: A2, A3 en B1. Review A1 wel op de reviewpagina, nooit op de homepage. Zet cijfers en quotes in de merkconfig, niet in componenten.
- **FAQ "andere keukens":** klopt, laten staan.
- **Amsterdam:** in de FAQ of bij werkgebied vermelden dat parkeerkosten in Amsterdam niet in de prijs zitten.
- Footer: "Montagebaas is geen onderdeel van IKEA."

### SEO
- Alle bestaande URL's blijven werken, of krijgen een 301 als een pagina echt vervalt (eerst melden).
- Title, meta description en LocalBusiness structured data behouden of verbeteren, met Montagebaas als naam.
- Lighthouse mobiel: performance en accessibility allebei 90 of hoger.

### Terugvaloptie
Oude configurator blijft twee weken bereikbaar op `/offerte-oud`, met `noindex`. Een env-variabele bepaalt welke versie op de homepage staat, zodat terugdraaien geen deploy van code vereist. Nieuwe aanvragen krijgen `site_versie = v2-redesign`.

## Fase 4: controle voor ik naar productie ga

1. End-to-end testaanvraag via elke route (naam met "test" erin, zodat hij uit de rapportage valt): rij in `aanvragen` met juiste route, pakket, prijs_getoond, attributie.
2. Redirect naar `/bedankt` en GA4-event `offerte_aanvraag` (debugview of network tab).
3. Screenshots op 390 px en 1440 px van elke stap, naast de mockup.
4. Bevestiging dat er geen bedragen in de frontend staan (grep op `€` en op getallen als 2775, 995) en dat de bestaande Schakel 2-tests groen zijn.
5. Lighthouse-rapport mobiel.
6. Lijst van alles wat je **niet** gedaan hebt of anders hebt opgelost dan hier staat.

Rapporteer met de preview-URL. Productie zet ik zelf door.
