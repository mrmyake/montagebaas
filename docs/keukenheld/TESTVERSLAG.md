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
- Vier klantmails gerenderd (formulier, PDF, link ok, link niet leesbaar): afzender
  `De Keukenheld <noreply@dekeukenheld.nl>`, onderwerp formulier "Je aanvraag bij De
  Keukenheld", geen oude naam. Zie `mailproef-keukenheld.txt`. Niet echt verstuurd: het
  Resend-account voor dekeukenheld.nl bestaat nog niet.

## Lighthouse mobiel (lokale productiebuild, 3 runs)

| | Performance | Toegankelijkheid | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Montagebaas | 95–96 | 100 | 100 | 100 | 2,8–2,9 s | 0,023 | 10–20 ms |
| De Keukenheld | 94–95 | 96 | 100 | 100 | 2,9–3,1 s | 0,023 | 40 ms |

Toegankelijkheid 96: `link-in-text-block` op de Werkspot-link in de reviewsectie. Zolang
`reviews.google.url` leeg is, staat de Google-score zonder link en is Werkspot de enige link
in die zin. Verwacht weg te zijn zodra Ilja de Google-link aanlevert.

## Nog niet getest (wacht op migratie 0019)

Alle drie de routes tot `/bedankt` op de preview, met `merk = keukenheld` in `aanvragen`:
zonder 0019 mislukt elke insert, want de code schrijft `merk` mee.
