# Testverslag Fase 1 (25-10-2026)

## MERK=montagebaas: geen enkele wijziging

Nulmeting op origin/main 37e0be4 (lokale productiebuild), daarna dezelfde meting op deze branch.

- Screenshots homepage 390 en 1440 px (volledige pagina en bovenste scherm): **0 pixels verschil**.
- Tekst, `<head>`, JSON-LD en alle links van 13 pagina's (home, offerte, kosten, werkwijze,
  reviews, werkgebied, vragen, over, privacy, bedankt, drie stadspagina's), plus sitemap en
  robots: **gelijk**. Alleen verwachte verschillen: CSS-hash, iconpaden (zelfde bestanden,
  nu onder `/brands/montagebaas/`) en de nieuwe `<link rel="manifest">`.
- `/favicon.ico` byte-gelijk aan het oude bestand.
- Klantmails: zelfde afzender, onderwerp en ondertekening (`scripts/mailproef-merk.mjs`).

## MERK=keukenheld

- Grep op tekst, head, JSON-LD, links, sitemap, robots en manifest van alle 13 pagina's:
  **0 keer "Montagebaas"**, lokaal én op de preview (met de override `NEXT_PUBLIC_SITE_URL`
  leeg; met de oude waarde wijzen canonical/OG/JSON-LD naar montagebaas.com, vandaar LIVEGANG
  stap 5). Wel nog de Werkspot-link `/profiel/hout-nieuw` (slug van Werkspot zelf).
- Verschillen met Montagebaas (pixelbanden): header (logo + naam), de naam op de bon,
  "Zelf doen, een klusplatform of De Keukenheld?" met kolomkop, en de footer. Niets anders.
  Screenshots naast elkaar: `screenshots/`.

## Mails via de echte codepaden (lokaal, MERK=keukenheld, nieuw Resend-account)

Lokale productiebuild met `MERK=keukenheld`, de dekeukenheld.nl-key in `.env.local`,
`ADS_UPLOAD_ACTIEF=false`, `NTFY_TOPIC` en `LEAD_NOTIFY_TO` leeg (alleen klantmails).
Vragen, PDF en link via de intake (Playwright); "link niet leesbaar" via een POST naar
`/api/offerte-link` met dezelfde velden als de intake en een niet-bestaand ontwerp (in v2
leidt een mislukte lezing in de UI naar vragen/PDF, dus deze mail komt alleen voor als de
verwerking na een geslaagde lezing faalt). Alles naar me@ilja.com.

| Mail | Aanvraag | Bedrag in de mail |
|---|---|---|
| Je aanvraag bij De Keukenheld (vragen) | 980d4841 | € 1.775 – € 2.475 (= op het scherm) |
| Je prijsindicatie voor je IKEA-keuken (PDF) | 2e32b725 | "Je indicatie: € 1.775 – € 2.475. Dit is de indicatie die je op de site zag." |
| Ontwerp ontvangen (link gelezen) | 238e734c | geen (TOON_PRIJS_BIJ_LINK uit, prijs_getoond leeg) |
| Aanvraag ontvangen, nog één vraag (link niet leesbaar) | effb86a7 | geen |

Afzender `De Keukenheld <noreply@dekeukenheld.nl>`, reply-to `ilja@dekeukenheld.nl`, geen oude
naam. Inhoud gecontroleerd met `scripts/controle-klantmails.mjs` (zelfde functies, rij uit de
database). Formuliermail naar mail-tester.com: **10/10**.

### Wat er eerder misging en waarom

De eerste testmails (`scripts/mailproef-merk.mjs`) toonden "€ 2.975 – € 2.975" in de linkmail
en de oude AI-tekst in de PDF-mail. Oorzaak: het **testscript** gaf zelf bedragen mee en geen
`aanvraagId`. In productie:
- PDF: `tekening-verwerker.ts` geeft altijd `aanvraagId` mee, de mail neemt bij v2 de band van
  het scherm. Was al goed.
- Link: `verwerker.ts` geeft alleen een bedrag mee als `TOON_PRIJS_BIJ_LINK` aan staat (uit).
  Was al goed.

Productie sinds de v2-livegang: vandaag alleen testaanvragen (3 van Ilja om 08:29–08:31 via de
preview, de rest van Claude). Het Montagebaas-Resend-account verstuurde vandaag één mail: 08:39,
de PDF-mail van Fase 4 aan me@ilja.com, met de v2-band. Geen klant heeft een verkeerde mail gehad.

Toch aangescherpt:
- `bedrag(min, max)` in `pricing.ts` (met test): één bedrag als laag en hoog gelijk zijn, overal
  in de mails.
- De linkmail kijkt nu net als de PDF-mail naar `prijs_getoond_*` van de aanvraag (`aanvraagId`):
  geen bedrag als de klant er geen zag, en anders "Dit is de indicatie die je op de site zag".
- `mailproef-merk.mjs` geeft geen verzonnen bedragen meer mee.

Tijdens het testen ving de echte run een fout van mij af: de eerste versie van `bedrag()` riep
zichzelf aan (zoek-en-vervang), waardoor de vragen- en PDF-mail crashten. Nooit gecommit; nu
gedekt door `pricing.test.ts`.

Alle 11 testaanvragen ("Test Keukenheld e2e …"): geen rij verstuurd naar Ads, alle gemarkeerd
als `overgeslagen`.

## Lighthouse mobiel (lokale productiebuild, 3 runs)

| | Performance | Toegankelijkheid | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Montagebaas | 95–96 | 100 | 100 | 100 | 2,8–2,9 s | 0,023 | 10–20 ms |
| De Keukenheld | 95 | **100** | 100 | 100 | 2,9 s | 0,023 | 20 ms |

Eerste meting Keukenheld gaf toegankelijkheid 96 (`link-in-text-block`: zonder Google-link was
de Werkspot-link de enige link in de zin). Met de Google-reviewlink
(`https://g.page/r/CR7MyzqJoUHcEBM`) is het 100. Rapport: `lighthouse-mobiel-keukenheld.report.html`.

## Drie routes op de preview (na migratie 0019)

Preview `montagebaas-git-feat-keukenheld-…vercel.app` met `MERK=keukenheld`, Playwright,
consent geaccepteerd, gegevens me@ilja.com.

| Route | Aanvraag | merk | invoermethode | site_versie | status | prijs_getoond | GA4 `offerte_aanvraag` |
|---|---|---|---|---|---|---|---|
| Vragen | d9a15f76-49cb-4f6c-b40d-0d874d02a0ba | keukenheld | formulier | v2-redesign | nieuw | 1775–2475 | `{invoermethode: formulier, site_versie: v2-redesign, merk: keukenheld}` |
| PDF | ef480973-e71e-4a12-8abf-cac9de546f29 | keukenheld | pdf | v2-redesign | controle_tekening (test-PDF is geen keuken, geen ANTHROPIC_API_KEY op Preview) | 1775–2475 | `{invoermethode: pdf, …, merk: keukenheld}` |
| Link | 4dafffa2-fed6-4794-a584-eeafe2fe2b37 | keukenheld | link | v2-redesign | link_verwerkt, planner_status ok | null (TOON_PRIJS_BIJ_LINK uit) | `{invoermethode: link, …, merk: keukenheld}` |

Alle drie eindigen op `/bedankt`, precies één `offerte_aanvraag`, geen paginafouten.

**Google Ads:** voor geen van de drie een rij in `ads_conversie_uploads` (ADS_UPLOAD_ACTIEF staat
op Preview niet aan). Daarna gemarkeerd met `scripts/markeer-testlead.mjs`: per actie
`overgeslagen`, `request_id` en `verzonden_op` leeg; de cron slaat ze over.
