# Opdracht: montagebaas.com wordt De Keukenheld (dekeukenheld.nl)

## Wat er verandert, en wat niet

Montagebaas gaat verder onder de naam **De Keukenheld**, op **dekeukenheld.nl**. Het gaat om een merkwissel. Design, functionaliteit, prijzen, intake en backend blijven precies zoals ze sinds het redesign (PR #12) zijn.

Wel veranderen:
- Naam: "De Keukenheld" (in lopende tekst), woordmerk "De Keukenheld"
- Logo, favicon, app-iconen en OG-afbeelding
- Domein: dekeukenheld.nl wordt het hoofddomein, montagebaas.com stuurt door met een 301
- E-mailadressen en de afzender van mails
- Elke klantgerichte vermelding van "Montagebaas", "montagebaas.com" of "@montagebaas.com"

Niet veranderen:
- Kleuren, typografie, layout, componenten: teal blijft
- Prijzen, tarieven, Schakel 1/2/3, de linkroute
- Interne namen: Supabase-schema `montagebaas`, tabelnamen, cookienamen (`mb_attributie`), env-namen. Die zijn niet zichtbaar voor klanten en hernoemen geeft alleen risico.
- Telefoon en WhatsApp: 06 2917 3468

Werkwijze: aparte worktree vanaf actuele main, branch `feat/keukenheld`. Werk zelfstandig door. Stop bij DNS, Vercel-domeinen, Google-accounts en alles wat productie raakt. Meld tegenstrijdigheden apart. Commit ook diagnostische bestanden.

## Bestanden

Pak `keukenheld-assets.zip` uit naar `public/brands/keukenheld/`:
- `logo-beeldmerk.png`: held met kast, transparant, werkt op licht en donker. Voor de header.
- `logo-volledig.png`: beeldmerk met "dekeukenheld.nl" en tagline. Zwarte tekst, **alleen op lichte achtergrond**.
- `favicon.ico` (16/32/48), `favicon-16.png` (vereenvoudigd schild), `favicon-32.png`, `favicon-48.png`
- `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` (op wit)
- `og-image.png` (1200×630)

De oude Montagebaas-iconen blijven staan, de merkconfig kiest.

## Fase 0: inventarisatie (rapporteer voordat je iets wijzigt)

1. Elke klantgerichte plek met "Montagebaas", "montagebaas.com", "@montagebaas.com", "Hout & Nieuw" of "TVMuur": pagina's, `content.ts`, `site.ts`, metadata, structured data, sitemap, robots, canonical, manifest, mails (klant en Ilja), ntfy, de `/bedankt`-pagina, admin, Gmail-concepten van Schakel 3.
2. Waar het domein hardcoded staat of uit een env komt (`NEXT_PUBLIC_SITE_URL` en dergelijke), plus CORS of toegestane origins (Supabase Storage, `/api/ontwerp-lezen`, `/api/offerte-*`).
3. Cookies: zetten we ergens een `domain`-attribuut? Wat gebeurt er met consent en attributie na de domeinwissel?
4. Mail: welke afzender gebruikt Resend nu, en welke env-variabelen bepalen dat?
5. Hoe `merkVoorHost` en de merkconfig in `src/lib/merk/` nu werken.
6. Volgnummer van de volgende migratie.

## Fase 1: code

### Merkconfig
- Voeg `keukenheld` toe aan `src/lib/merk/`:
  - naam: De Keukenheld
  - domein: dekeukenheld.nl
  - e-mail klantcontact: info@dekeukenheld.nl
  - afzender mails: De Keukenheld <noreply@dekeukenheld.nl>
  - telefoon en WhatsApp: ongewijzigd
  - KvK: 74579320
  - logo-paden uit `public/brands/keukenheld/`
- Het actieve merk komt uit een env-variabele `MERK` (`montagebaas` | `keukenheld`, standaard `montagebaas`). Zo is de overstap een env-wijziging plus een domeinwissel, en terugdraaien kan op dezelfde manier. Geen hostname-logica nodig: er draait straks maar één merk.

### Weergave
- Header: `logo-beeldmerk.png` (ongeveer 42 px hoog) naast de tekst "De Keukenheld" in Schibsted Grotesk 800. Niet de PNG met "dekeukenheld.nl" in de header.
- Footer: "De Keukenheld is een handelsnaam van [juridische naam uit KvK], KvK 74579320. Voorheen Montagebaas. Geen onderdeel van IKEA."
- Reviews: de reviews staan op Google en Werkspot onder de oude namen. Zet bij het reviewcijfer "4,9 uit 56 reviews op Google en Werkspot (als Montagebaas)". Quotes blijven letterlijk.
- Geen nieuwe secties, banners of andere layoutwijzigingen. Het design blijft exact zoals in PR #12. Alleen logo, naam en de teksten hierboven veranderen.
- Metadata, titels, structured data (LocalBusiness `name`, `url`, `logo`, `alternateName: "Montagebaas"`), manifest, OG-afbeelding: alles via de merkconfig.

### Mails en meldingen
- Klantmails: afzender, onderwerp ("Je aanvraag bij De Keukenheld") en ondertekening via de merkconfig.
- Mails en ntfy aan Ilja mogen het merk noemen, verder ongewijzigd.

### Data
- Migratie (alleen toevoegen): `merk text not null default 'montagebaas' check (merk in ('montagebaas','keukenheld'))` op `aanvragen`. De app schrijft het actieve merk mee. Neem `merk` op in `lead_overzicht` en geef `offerte_aanvraag` in GA4 de parameter `merk` mee.
- Dry-run met rollback op de echte database, dan pas toepassen na akkoord. Zelfde werkwijze als bij 0018.

### Domein en doorsturen
- Alle canonical-URL's, de sitemap, robots en structured data gebruiken het domein van het actieve merk.
- Schrijf in `docs/keukenheld/REDIRECTS.md` hoe montagebaas.com straks doorstuurt: elke URL met een 301 naar hetzelfde pad op dekeukenheld.nl, **met behoud van de querystring** (gclid, gbraid, wbraid, utm_*). Dat laatste is essentieel voor de Ads-attributie. Kies tussen een Vercel-domeinredirect of een redirect in de app, en onderbouw je keuze. Test het op de preview met een URL met `?gclid=test123&utm_source=google`.
- Toegestane origins (CORS, Storage) krijgen beide domeinen.

### Testen
- Playwright met `MERK=keukenheld` op de preview: homepage, alle drie routes tot `/bedankt`, de rij in `aanvragen` heeft `merk = 'keukenheld'`, mailtekst klopt (lokaal versturen naar me@ilja.com, zoals bij de PDF-mail).
- Met `MERK=montagebaas`: geen enkele visuele wijziging.
- Screenshots op 390 en 1440 px van de homepage, Montagebaas naast Keukenheld. Het enige verschil mag het logo, de naam en de genoemde teksten zijn.
- Grep: geen "Montagebaas" meer in klantteksten bij `MERK=keukenheld`, behalve "voorheen Montagebaas", `alternateName` en de reviewbron.
- Lighthouse mobiel.

## Fase 2: checklist voor Ilja (niet zelf uitvoeren)

Lever `docs/keukenheld/LIVEGANG.md` met deze stappen, in deze volgorde, met de exacte DNS-records erbij:

**Vooraf, kost een paar dagen:**
1. KvK: handelsnaam "De Keukenheld" toevoegen.
2. Google Workspace: dekeukenheld.nl als aliasdomein, MX-records, aliassen info@ en ilja@, "Verzenden als" in Gmail.
3. Resend: dekeukenheld.nl verifiëren (SPF, DKIM, DMARC). Mail-tester moet 10/10 halen.
4. Vercel: de huidige redirect van dekeukenheld.nl naar montagebaas.com weghalen, dekeukenheld.nl en www toevoegen aan het project.

**Overstapdag (doordeweekse ochtend):**
5. Env `MERK=keukenheld` en de nieuwe Resend-afzender op Production, redeploy.
6. dekeukenheld.nl wordt het primaire domein, montagebaas.com en www sturen door met een 301, querystring blijft behouden. Test met een gclid-URL.
7. Echte testaanvraag op de iPhone: rij, merk, mail, geen Ads-upload.
8. Search Console: property dekeukenheld.nl toevoegen, sitemap indienen, daarna adreswijziging vanaf montagebaas.com.
9. Google Ads: eindadressen en weergavepaden naar dekeukenheld.nl. Koppen met "Montagebaas" vervangen. In de merkcampagne "keukenheld"-zoekwoorden toevoegen en "montagebaas" laten staan. Sitelinks op campagneniveau bijwerken. Advertenties gaan opnieuw door de review.
10. GA4: URL van de webstream aanpassen. Conversies blijven gelijk.
11. Google Bedrijfsprofiel: naam en website aanpassen. Reviews blijven staan, een naamswijziging kan wel een nieuwe verificatie vragen.
12. Werkspot: profielnaam en website.

**Daarna:**
13. montagebaas.com en de mailboxen minstens 12 maanden actief houden.

## Oplevering

Kort rapport: wat er is gebouwd, de migratie, de redirect-keuze, de gevonden plekken uit Fase 0, open punten en de preview-URL. Niets live zetten zonder akkoord.
