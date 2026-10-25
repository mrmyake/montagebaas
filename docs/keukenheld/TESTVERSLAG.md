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

## Mails (echt verstuurd, lokaal, nieuw Resend-account dekeukenheld.nl)

Vier klantmails (formulier, PDF, link gelezen, link niet leesbaar) naar me@ilja.com: 4× Resend
HTTP 200. Afzender `De Keukenheld <noreply@dekeukenheld.nl>`, reply-to `ilja@dekeukenheld.nl`,
onderwerp formulier "Je aanvraag bij De Keukenheld", geen oude naam in afzender, onderwerp,
tekst of HTML. Zie `mailproef-keukenheld.txt`.

Formuliermail naar mail-tester.com (test-g4ev751m3@srv1.mail-tester.com): **10/10**
("properly authenticated", geen blocklist, geen kapotte links).

Montagebaas ongewijzigd: afzender, onderwerp, ondertekening en reply-to (LEAD_NOTIFY_TO) gelijk.

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
