# Fase 4: controle redesign (25-10-2026)

Preview: commit `eeda4eb` (testleads) en `d20gqhcz9` (na twee UI-fixes, schermafbeeldingen).
Migratie 0018 toegepast op 25-10-2026 na akkoord; dry-run: `node scripts/dryrun-migratie-0018.mjs`.

## Testleads

Alle drie met me@ilja.com en 06 2917 3468, naam met "test", via de preview.

| Route | Aanvraag | invoermethode | site_versie | pakket / demontage | prijs_getoond | Overig |
|---|---|---|---|---|---|---|
| Link | a2369f21-4f04-4da2-8c91-fa86dffb627c | link | v2-redesign | compleet / ja | null (TOON_PRIJS_BIJ_LINK uit) | 2 snapshots gekoppeld: de lezing vóór verzenden (lees_token) en die van de verwerker; planner_status ok |
| PDF | 808b9bc5-ab51-43cb-99bf-896968311d3c | pdf | v2-redesign | montageklaar / nee | 1075–1775 | klein, recht; status controle_tekening (test-PDF is geen keuken) |
| Vragen | ca0e480b-aa4f-4c02-abf2-76533c69a025 | formulier | v2-redesign | – / ja | 3090–3770 | complete IKEA, 8-14, hoek, demontage + leiding (na opname) |

## Google Ads: geen upload

- Vóór het markeren stond er voor geen van de drie een rij in `ads_conversie_uploads`: de directe upload op de preview deed niets (ADS_UPLOAD_ACTIEF staat op Preview niet op "true").
- Direct daarna `node scripts/markeer-testlead.mjs <id>`: voor elke actie `overgeslagen`, `request_id` en `verzonden_op` leeg. De werkvoorraad slaat `overgeslagen` over, dus de cron raakt ze niet.
- Vangnet in de code (na merge): `beslis()` slaat elke naam met "test" over (`isTestNaam`, tests in ads-conversies.test.ts).

## GA4 (preview: shim, niets naar Google)

Buiten productie laadt gtag.js niet; events komen in `window.dataLayer`. Per route, na consent:

- Link: `ontwerp_gelezen {route: link, gelukt: true, vertrouwen: hoog}`, `intake_stap` 2–4, daarna op /bedankt precies één `offerte_aanvraag {invoermethode: link, site_versie: v2-redesign}`. Refresh van /bedankt: geen nieuw event.
- PDF: `route_gekozen {route: pdf}`, `intake_stap` 1–4, één `offerte_aanvraag {invoermethode: pdf, site_versie: v2-redesign}`.
- Vragen: `ontwerp_gelezen {gelukt: false}`, `overstap_naar_vragen {van_route: link, reden: lezen_mislukt}`, `intake_stap` 1–5, één `offerte_aanvraag {invoermethode: formulier, site_versie: v2-redesign}`.
- Stap 1 vóór consent werd eerst gemist; sinds `d20gqhcz9` volgt hij direct na accepteren. Vóór consent: 0 events.

## Schermafbeeldingen

`screenshots/`: per route alle stappen op 390 px en 1440 px. De mockups (`docs/design/*.dc.html`) zijn niet naast te leggen: ze hebben `support.js` nodig, dat niet is meegeleverd.

## Lighthouse

`lighthouse-mobiel.report.html` (lokaal, productiebuild, vóór de tarieven-ombouw): performance 95, accessibility 100, best practices 100, SEO 100.
