# Livegang De Keukenheld

Checklist voor Ilja. Claude voert hier niets van uit zonder akkoord. Volgorde aanhouden.

Overstappen = `MERK=keukenheld` + Resend-paar + domeinen. Terugdraaien = dezelfde drie terug
(onderaan). **Niet via `SITE_VERSIE`.**

## 0. Al gedaan (25-10-2026)

- [x] Migratie 0019 toegepast (`merk` op `aanvragen`, in `lead_overzicht`). Bestaande rijen en
      de huidige productiecode krijgen `montagebaas` via de default.
- [x] Resend-account voor dekeukenheld.nl, domein Verified (EU, euw1).
- [x] Echte klantmails via het nieuwe account: 4× HTTP 200 naar me@ilja.com, mail-tester 10/10.
- [x] Drie testaanvragen via de preview (link, PDF, vragen): `merk = keukenheld`, niets naar Ads.

## 1. Vóór de overstap

1. **PR mergen.** Production bouwt dan met `MERK` leeg = Montagebaas. Getest: tot op de pixel
   gelijk aan de huidige site (390 en 1440 px), zelfde tekst, structured data, sitemap,
   robots en mails. Nieuw is alleen `/manifest.webmanifest`.
2. **DNS dekeukenheld.nl: niets wijzigen.** Gemeten met dig op 25-10-2026:

   | Record | Waarde | Voor |
   |---|---|---|
   | A @ | 216.198.79.1 | Vercel |
   | CNAME www | `0beddec0bfcc6b89.vercel-dns-017.com` | Vercel |
   | MX @ | Google (aspmx + alt1–4) | Workspace-mail |
   | TXT @ | `v=spf1 include:dc-aa8e722993._spfm.dekeukenheld.nl ~all` (→ `_spf.google.com`) | SPF, één record |
   | TXT _dmarc | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=…` | DMARC |
   | CNAME send | `send.forge.rmta.net` | Resend |
   | CNAME rsend | `rsend-euw1.forge.rmta.net` | Resend |
   | TXT resend._domainkey | sleutel van het nieuwe account | Resend DKIM |

   `forge.rmta.net` is de verzendinfrastructuur van Resend. Deze records niet weghalen of
   aanpassen.
3. **Google Workspace** (Ilja bevestigt; Claude kan het niet zien):
   - [ ] info@dekeukenheld.nl bestaat en komt aan
   - [ ] ilja@dekeukenheld.nl bestaat en komt aan: dit is de **reply-to van alle klantmails**
         bij De Keukenheld. Een klant die op de bevestiging antwoordt, mailt dit adres.
   - [ ] "Verzenden als" info@dekeukenheld.nl staat aan in Gmail

## 2. Overstap (doordeweekse ochtend, na akkoord)

4. **Env op Production** (Settings → Environment Variables), alles in één keer, dan
   **Redeploy**:
   - `MERK` = `keukenheld` (nieuw)
   - `RESEND_API_KEY` = key van het dekeukenheld.nl-account
   - `RESEND_FROM_EMAIL` = `De Keukenheld <noreply@dekeukenheld.nl>`
   - `NEXT_PUBLIC_SITE_URL`: **weghalen**, tegelijk met `MERK=keukenheld`. Het domein komt
     dan uit het merk. Blijft hij staan, dan wijzen canonical, sitemap, OG en structured data
     naar montagebaas.com (lokaal getest).
   - `ADS_UITSLUITEN`: `@dekeukenheld.nl` toevoegen. De standaardlijst in de code heeft hem
     al, maar de env vervangt die lijst.

   `LEAD_NOTIFY_TO` en `PLANNER_MONITOR_TO` op `ilja@dekeukenheld.nl` zetten: daar gaan de meldingen aan Ilja heen (aparte mailbox, geen alias van montagebaas).
5. **Domeinen** (Settings → Domains), zie REDIRECTS.md:
   - dekeukenheld.nl: redirect naar montagebaas.com weghalen, wordt het **primaire domein**
   - www.dekeukenheld.nl → `https://dekeukenheld.nl`, **308** (staat nu op 307)
   - montagebaas.com → `https://dekeukenheld.nl`, **301 of 308**
   - www.montagebaas.com → `https://dekeukenheld.nl`, **301 of 308**
6. **Redirects testen**: pad en querystring moeten mee.
   ```
   curl -sI "https://montagebaas.com/?gclid=test123&utm_source=google" | grep -iE '^(HTTP|location)'
   curl -sI "https://www.montagebaas.com/kosten?gclid=test123&utm_source=google" | grep -iE '^(HTTP|location)'
   curl -sI "https://www.dekeukenheld.nl/kosten?gclid=test123&utm_source=google" | grep -iE '^(HTTP|location)'
   ```
   Verwacht `location: https://dekeukenheld.nl/<zelfde pad>?gclid=test123&utm_source=google`.
7. **Controle op dekeukenheld.nl**: logo en naam in de header, footer met de KvK-regel,
   `view-source:` bevat geen "Montagebaas", `/favicon.ico` is het schild, `/sitemap.xml` en
   `/robots.txt` noemen dekeukenheld.nl.
8. **Echte testaanvraag op de iPhone** (e-mail me@ilja.com, telt als testlead): rij in
   `aanvragen` met `merk = keukenheld`, klantmail van `De Keukenheld <noreply@dekeukenheld.nl>`
   met reply-to `ilja@dekeukenheld.nl`, ntfy komt binnen, **geen** Ads-upload.
9. **Search Console**: property dekeukenheld.nl (domein) toevoegen, `sitemap.xml` indienen,
   daarna in de property montagebaas.com: Instellingen → Adreswijziging → dekeukenheld.nl.
10. **Google Ads**: eindadressen en weergavepaden naar dekeukenheld.nl. Koppen met
    "Montagebaas" vervangen. Merkcampagne: "keukenheld"-zoekwoorden toevoegen, "montagebaas"
    laten staan. Sitelinks op campagneniveau bijwerken. Advertenties gaan opnieuw door de review.
11. **GA4**: webstream-URL naar dekeukenheld.nl. Aangepaste dimensie **`merk`** (event-scope)
    aanmaken, zoals eerder `site_versie`: `offerte_aanvraag` stuurt hem al mee. Conversies
    blijven gelijk.
12. **Google Bedrijfsprofiel**: naam en website. Het profiel heet nu "De Keukenheld -
    TVMuur.com"; controleer of dat de bedoelde naam is. Reviews blijven staan; een naamswijziging
    kan om nieuwe verificatie vragen. De reviewlink in de merkconfig
    (`https://g.page/r/CR7MyzqJoUHcEBM`) blijft daarbij werken.
13. **Werkspot**: profielnaam en website. Verandert de profiel-URL (nu `/profiel/hout-nieuw`),
    geef de nieuwe door voor `reviews.werkspot.url`.

## 3. Nazorg

14. **Google-DKIM voor dekeukenheld.nl** (Workspace, 24–72 uur wachttijd). Blokkeert de
    overstap niet: SPF en Resend-DKIM zijn in orde. Daarna controleren met
    `dig +short TXT google._domainkey.dekeukenheld.nl`. Hetzelfde geldt voor montagebaas.com.
15. montagebaas.com en de mailboxen minstens 12 maanden actief houden.

## Terugdraaien

1. Production: `MERK=montagebaas`, `RESEND_API_KEY` en `RESEND_FROM_EMAIL` terug naar die van
   montagebaas.com, `NEXT_PUBLIC_SITE_URL` mag weg blijven (Montagebaas geeft zelf
   `https://montagebaas.com`). Redeploy.
2. Domeinen: montagebaas.com weer primair, dekeukenheld.nl en www → montagebaas.com.
3. Aanvragen die intussen binnenkwamen houden `merk = keukenheld`; zo zie je ze terug in
   `lead_overzicht`.
