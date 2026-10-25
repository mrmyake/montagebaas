# Attributie v2 / dekeukenheld.nl — diagnose 25-10-2026

## Vraag
Alle v2-aanvragen van vandaag hadden landing_page, referrer en ga_client_id = NULL.
Vermoeden: attributiecookie of URL-capture niet meegegaan in de redesign of de domeinswitch.

## Uitkomst
Hypothese klopt **niet** voor het normale pad, wel voor één zijpad.

1. **Testleads zonder parameters.** `leesUitUrl` legt landing_page en referrer alleen vast
   als de URL een gclid/gbraid/wbraid of utm_* bevat (zo ontworpen: een direct bezoek mag een
   eerdere advertentieklik niet wissen). De 15 v2-testleads van vandaag kwamen binnen zonder
   parameters, dus NULL is verwacht. Op v1 hadden alleen de leads mét gclid een landing_page.
2. **Cookie, tags en redirect werken op dekeukenheld.nl.** `mb_attributie` is host-only
   (geen domain-attribuut, dus niets hardcoded op montagebaas.com), gezet client-side in
   `AttributieCapture` (root layout, ook in de v2-tak). GA4 G-VQ7YH02335 en AW-11009845057
   staan in de HTML. montagebaas.com, www.montagebaas.com en www.dekeukenheld.nl geven 308
   naar dekeukenheld.nl met behoud van de querystring.
3. **Lek: toestemming via het vinkje in de intake.** Klikt de bezoeker niet op de cookiebalk
   maar geeft hij toestemming met het (standaard aangevinkte) vinkje bij verzenden, dan zette
   `AttributieCapture` de cookie pas op dat moment, op /offerte, waar de parameters niet meer
   in de URL staan. Gevolg: gclid, utm_*, landing_page en referrer leeg; alleen ga_client_id
   gevuld. Gold ook al op v1 (zelfde component).

## Fix
`AttributieCapture` onthoudt de binnenkomst-URL + referrer van de paginalading in het
geheugen van het tabblad (geen opslag op het apparaat) en schrijft die bij een latere
toestemming alsnog weg. Privacytekst aangepast. Daarnaast slaat de Ads-upload elke aanvraag
over waarvan de klik-ID met `TEST_` begint (naast de bestaande e-mail-uitsluiting).

## Testresultaten (productie, testscript `attributie-e2e.js`)
Binnenkomst `/?gclid=TEST_CC_<ts>&utm_source=cc-test&utm_medium=cpc&utm_campaign=attributietest`
met referrer www.google.com, dan /kosten, dan /offerte, dan intake.

| Route | Toestemming | gclid | utm_* | landing_page | referrer | ga_client_id | merk / site_versie |
|---|---|---|---|---|---|---|---|
| vragen | banner | ✔ | ✔ | ✔ | ✔ | ✔ | keukenheld / v2-redesign |
| pdf | banner | ✔ | ✔ | ✔ | ✔ | ✔ | keukenheld / v2-redesign |
| link | banner | ✔ | ✔ | ✔ | ✔ | ✔ | keukenheld / v2-redesign |
| vragen | vinkje | ✘ | ✘ | ✘ | ✘ | ✔ | keukenheld / v2-redesign |
| vragen via montagebaas.com (redirect) | banner | ✔ | n.v.t. | ✔ | ✔ | ✔ | keukenheld / v2-redesign |
| vragen, lokaal met fix | vinkje | ✔ | ✔ | ✔ | ✔ | n.v.t. (GA uit buiten productie) | keukenheld / v2-redesign |

Na deploy (f2e71ee, productie, alleen het vinkje als toestemming):

| Route | Toestemming | gclid | utm_* | landing_page | referrer | ga_client_id | merk / site_versie |
|---|---|---|---|---|---|---|---|
| vragen | vinkje | ✔ | ✔ | ✔ | ✔ | ✔ | keukenheld / v2-redesign |
| pdf | vinkje | ✔ | ✔ | ✔ | ✔ | ✔ | keukenheld / v2-redesign |
| link | vinkje | ✔ | ✔ | ✔ | ✔ | ✔ | keukenheld / v2-redesign |
| vragen via montagebaas.com (redirect) | vinkje | ✔ | n.v.t. | ✔ | ✔ | ✔ | keukenheld / v2-redesign |

Alle testrijen: `ads_conversie_uploads` status `overgeslagen` (testinzending), niets verstuurd.

Bijvangst: elke pagina gooit React-fout #418 (hydration mismatch). Niet onderzocht.
