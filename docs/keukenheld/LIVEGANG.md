# Livegang De Keukenheld

Checklist voor Ilja. Claude voert hier niets van uit. Volgorde aanhouden.

Overstappen = `MERK=keukenheld` + Resend-paar + domeinen. Terugdraaien = dezelfde drie terug
(onderaan). **Niet via `SITE_VERSIE`.**

## 0. Vóór de merge (eenmalig)

1. **Migratie 0019 toepassen** (na akkoord, Claude draait hem): `merk` op `aanvragen`. De code
   op deze branch schrijft `merk` in elke aanvraag; zonder 0019 mislukt elke insert. Dus eerst
   0019, dan mergen. Dry-run: `docs/keukenheld/dryrun-0019.txt`.
2. **PR mergen.** Production bouwt dan met `MERK` leeg = Montagebaas. Getest: tot op de pixel
   gelijk aan de huidige site (390 en 1440 px), zelfde tekst, structured data, sitemap en
   robots. Nieuw is alleen `/manifest.webmanifest`.

## 1. Vooraf controleren (DNS, gemeten 25-10-2026 met dig)

| Record | dekeukenheld.nl | Oordeel |
|---|---|---|
| A apex | 216.198.79.1 (Vercel) | goed |
| www | CNAME `0beddec0bfcc6b89.vercel-dns-017.com` | goed |
| MX | Google (aspmx + alt1–4) | goed |
| SPF (apex) | `v=spf1 include:dc-aa8e722993._spfm.dekeukenheld.nl ~all` → `include:_spf.google.com` | goed, één SPF-record |
| DMARC | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` | goed |
| DKIM Google (`google._domainkey`) | **ontbreekt** (ook op montagebaas.com) | aanrader, zie onder |
| DKIM Resend (`resend._domainkey`) | **staat er al** (`p=MIGfMA0…HochjAIF…`, andere sleutel dan montagebaas.com) | controleren, zie stap 2 |
| `send` | **CNAME → `send.forge.rmta.net`** (met eigen SPF `ip4:52.3.252.119 ip4:44.222.39.36 ip4:199.249.231.0/24`) | **botst** met Resend, zie stap 2 |

Ter vergelijking montagebaas.com: `send` heeft TXT `v=spf1 include:…_spfm.send.montagebaas.com`
(→ `include:amazonses.com`), geen CNAME.

**Vraag aan Ilja:** wat is `forge.rmta.net`? Een eerdere maildienst of een
standaardinstelling van GoDaddy? Een CNAME op `send` sluit andere records op `send` uit.

### 2. Resend (tweede gratis account, dekeukenheld.nl)

1. Maak het account aan, voeg het domein `dekeukenheld.nl` toe (regio zoals montagebaas.com).
2. Kijk in Domains → dekeukenheld.nl → DNS Records. Staat daar dezelfde DKIM-sleutel als de
   `resend._domainkey` die al in DNS staat? Dan is die van dit account; zo niet, vervangen.
3. **Verwijder eerst de CNAME `send` → `send.forge.rmta.net`** (als stap 1 bevestigt dat hij weg kan).
4. Voeg bij GoDaddy toe, met de waarden letterlijk uit het Resend-dashboard (alleen de naam,
   zonder `.dekeukenheld.nl`):

   | Type | Naam | Waarde | Prioriteit |
   |---|---|---|---|
   | TXT | `resend._domainkey` | DKIM-sleutel uit Resend (`p=…`) | |
   | MX | `send` | `feedback-smtp.<regio>.amazonses.com` (uit Resend) | 10 |
   | TXT | `send` | `v=spf1 include:amazonses.com ~all` | |

   Niets wijzigen aan de SPF op de apex of aan DMARC.
5. Verifiëren in Resend. Daarna een mail naar mail-tester.com (10/10) met:
   `MERK=keukenheld node scripts/mailproef-merk.mjs --verstuur`, met in `.env.local` tijdelijk
   de nieuwe `RESEND_API_KEY` en `RESEND_FROM_EMAIL=De Keukenheld <noreply@dekeukenheld.nl>`
   (en het adres in het script tijdelijk op dat van mail-tester).
6. Zet de nieuwe key en afzender nog **niet** op Production.

Aanrader Google Workspace: DKIM aanzetten (Admin → Apps → Gmail → E-mail verifiëren) voor
dekeukenheld.nl en montagebaas.com. Voegt TXT `google._domainkey` toe.

### 3. Google Workspace (Ilja bevestigt, Claude kan het niet zien)

- [ ] info@dekeukenheld.nl bestaat (alias) en komt aan
- [ ] ilja@dekeukenheld.nl bestaat (alias) en komt aan
- [ ] "Verzenden als" info@dekeukenheld.nl staat aan in Gmail

### 4. Vercel-domeinen

- [ ] Bij dekeukenheld.nl en www.dekeukenheld.nl de redirect naar montagebaas.com weghalen,
      zodat ze de app tonen. Doe dit pas op de overstapdag, direct vóór stap 6, anders toont
      dekeukenheld.nl de Montagebaas-site.

## Overstap (zodra Fase 1 getest is en Ilja akkoord geeft)

5. **Env op Production** (Settings → Environment Variables), daarna **Redeploy**:
   - `MERK` = `keukenheld` (nieuw)
   - `RESEND_API_KEY` = key van het nieuwe account
   - `RESEND_FROM_EMAIL` = `De Keukenheld <noreply@dekeukenheld.nl>`
   - `NEXT_PUBLIC_SITE_URL`: **weghalen**. Het domein komt nu uit het merk; deze env is alleen
     nog een override, en met de oude waarde wijzen canonical, sitemap, OG en structured data
     naar montagebaas.com (lokaal getest). Weghalen kan ook nu al: de waarde is gelijk aan
     wat Montagebaas zelf geeft.
   - `ADS_UITSLUITEN`: `@dekeukenheld.nl` toevoegen (de standaardlijst in de code heeft hem al,
     maar de env overschrijft die).
6. **Domeinen**: dekeukenheld.nl primair (apex), www.dekeukenheld.nl → dekeukenheld.nl.
   montagebaas.com en www.montagebaas.com → **301** naar `https://dekeukenheld.nl`
   (pad en query blijven, zie REDIRECTS.md). Testen met:
   `curl -sI "https://montagebaas.com/kosten?gclid=test123&utm_source=google"`
   → `301`, `location: https://dekeukenheld.nl/kosten?gclid=test123&utm_source=google`.
7. **Controle op dekeukenheld.nl**: logo en naam in de header, footer met de KvK-regel,
   `view-source:` bevat geen "Montagebaas", `/favicon.ico` is het schild,
   `/sitemap.xml` en `/robots.txt` noemen dekeukenheld.nl.
8. **Echte testaanvraag op de iPhone** (e-mail `me@ilja.com`, geldt als testlead): rij in
   `aanvragen` met `merk = keukenheld`, klantmail van `De Keukenheld <noreply@dekeukenheld.nl>`
   met onderwerp "Je aanvraag bij De Keukenheld", ntfy komt binnen, **geen** Ads-upload
   (testlead via `ADS_UITSLUITEN`).
9. **Search Console**: property dekeukenheld.nl (domein) toevoegen, `sitemap.xml` indienen,
   daarna in de property montagebaas.com: Instellingen → Adreswijziging → dekeukenheld.nl.
10. **Google Ads**: eindadressen en weergavepaden naar dekeukenheld.nl. Koppen met
    "Montagebaas" vervangen. Merkcampagne: "keukenheld"-zoekwoorden toevoegen,
    "montagebaas" laten staan. Sitelinks op campagneniveau bijwerken. Advertenties gaan
    opnieuw door de review.
11. **GA4**: webstream-URL naar dekeukenheld.nl. Aangepaste dimensie **`merk`** (event-scope)
    aanmaken, zoals eerder `site_versie`: `offerte_aanvraag` stuurt hem al mee. Conversies
    blijven gelijk.
12. **Google Bedrijfsprofiel**: naam "De Keukenheld" en website dekeukenheld.nl. Reviews
    blijven staan; een naamswijziging kan om nieuwe verificatie vragen. Daarna de nieuwe
    reviewlink aan Claude geven: veld `reviews.google.url` in `src/lib/merk/keukenheld.ts`
    (staat nu op `null`, de Google-score staat dan zonder link).
13. **Werkspot**: profielnaam en website. Verandert de profiel-URL (nu `/profiel/hout-nieuw`),
    geef de nieuwe dan door voor `reviews.werkspot.url`.

## Daarna

14. montagebaas.com en de mailboxen minstens 12 maanden actief houden.

## Terugdraaien

1. Production: `MERK=montagebaas`, `RESEND_API_KEY` en `RESEND_FROM_EMAIL` terug naar die van
   montagebaas.com, Redeploy.
2. Domeinen: montagebaas.com weer primair, dekeukenheld.nl → montagebaas.com.
3. Aanvragen die intussen binnenkwamen houden `merk = keukenheld`; dat klopt, zo zie je ze
   terug in `lead_overzicht`.
