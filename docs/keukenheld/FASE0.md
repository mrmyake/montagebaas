# Fase 0: inventarisatie merkwissel naar De Keukenheld

Stand: 25-10-2026, branch `feat/keukenheld` vanaf origin/main 37e0be4. Nog niets gewijzigd aan code.

## 1. Klantgerichte vermeldingen van het oude merk

Twee bronnen voor merkgegevens naast elkaar:
- `src/lib/merk/` (redesign, v2): gebruikt door `layout.tsx` (alleen de `--merk-accent`-variabelen), `HeaderV2`, `FooterV2`, `HomeV2`, `Secties`, `apple-icon.tsx`.
- `src/lib/site.ts` (oud): gebruikt in 15 bestanden, waaronder `layout.tsx` (metadata, OG, Twitter), `schema.ts` (LocalBusiness, WebSite), `robots.ts`, `sitemap.ts`, `notify.ts` (ondertekening, onderwerp), `privacy`, `bedankt`, de oude Header/Footer.

Fase 1 moet `site.ts` uit de merkconfig laten afleiden, anders blijven metadata en mails op "Montagebaas" staan.

Hardcoded "Montagebaas" in klantteksten:

| Plek | Wat |
|---|---|
| `src/app/page.tsx:19` | title "… \| Montagebaas" |
| `src/app/kosten/page.tsx:17,166,174` | description, "Montagebaas vs. de montage van IKEA zelf", "Bij Montagebaas" |
| `src/app/over/page.tsx:8,10,41,53` | title, description, intro, lopende tekst |
| `src/app/reviews/page.tsx:25,28,64` | description, OG-title, lopende tekst |
| `src/app/werkgebied/page.tsx:13` | description |
| `src/app/keukenmonteur/[stad]/page.tsx:38` | description buiten-werkgebied |
| `src/app/privacy/page.tsx:9` (+ `site.naam` r. 26) | description, verwerkingsverantwoordelijke |
| `src/lib/content.ts:76,116` | FAQ-antwoorden (kosten, wie is Ilja) |
| `src/lib/steden.ts:82,203,214` | stadsteksten Eindhoven, Maastricht, Hilversum |
| `src/components/sections/Pijlers.tsx:11` | eyebrow "Waarom Montagebaas" (v1) |
| `src/components/brand/Logo.tsx:12` | aria-label (v1-logo) |
| `src/lib/site.ts:45`, `merk/montagebaas.ts` | WhatsApp-openingsbericht "Hoi Montagebaas, …" |
| `src/components/analytics/TekeningIndicatie.tsx:97` | WhatsApp-bericht op `/bedankt` (clientcomponent) |
| `src/lib/notify.ts:403,712` | WhatsApp-links in klantmails |
| `src/lib/notify.ts:163,188,202,441,458,750,767` | ondertekening en onderwerp "Bedankt voor je aanvraag bij Montagebaas" via `site.naam` |
| `src/lib/merk/montagebaas.ts` reviews.google.url | zoek-URL "Montagebaas - TVMuur.com Loosdrecht" |

Niet klantgericht (laten staan of alleen merk noemen):
- `src/proxy.ts:22` basic-auth realm "Montagebaas admin", `admin/layout.tsx`, `admin/roi`, `admin/leads`: admin.
- `src/app/api/ntfy-cta/route.ts:49`: ntfy "… op montagebaas.com" (aan Ilja; wordt merkdomein).
- `notify.ts:794` planner-monitor standaard `ilja@montagebaas.com`: intern.
- `consent.ts` sleutel `montagebaas_consent`, cookie `mb_attributie`, schema `montagebaas`, scripts, tests: intern, blijft.

"Hout & Nieuw" en "TVMuur" komen alleen voor in commentaar van `testimonials.ts` en in de Google-zoek-URL. Niet in zichtbare tekst.

Bestaat nu niet: geen manifest, geen OG-afbeelding, geen `opengraph-image`. Iconen zijn Next-bestandsconventies: `src/app/favicon.ico`, `src/app/icon.svg`, `src/app/apple-icon.tsx` (gegenereerd uit de accentkleur). `favicon.ico` en `icon.svg` worden altijd geserveerd, ongeacht merk; die moeten in Fase 1 via `metadata.icons` uit de merkconfig komen.

`/bedankt`: geen merknaam, alleen telefoon uit `site.ts`. Gmail-concepten van Schakel 3: bestaan niet (zie tegenstrijdigheden).

## 2. Domein

- `NEXT_PUBLIC_SITE_URL ?? site.url` in `layout.tsx:56` (metadataBase, canonical, OG-url), `robots.ts`, `sitemap.ts`, `schema.ts`, `notify.ts:835` (link in herinneringsmail).
- `NEXT_PUBLIC_SITE_URL` staat in Vercel op **Production en Preview** (130 dagen oud), lokaal `https://montagebaas.com`. Die wint dus van de merkconfig. Een preview met `MERK=keukenheld` krijgt zonder aanpassing canonical montagebaas.com.
- Hardcoded `https://montagebaas.com` alleen in `site.ts`, `merk/montagebaas.ts` en tests.
- CORS / toegestane origins: geen. Uploads (`offerte-upload`, `offerte-link`, `ontwerp-lezen`) gaan als formData naar de eigen route handler, die server-side naar Supabase Storage schrijft. Geen browser-naar-Storage, geen Origin-checks, `next.config.ts` heeft geen `allowedOrigins`. Server actions vergelijken Origin met Host: na de redirect is dat één domein, dus goed.
- Vercel-domeinen: `dekeukenheld.nl` en `montagebaas.com` staan allebei op het account (DNS bij derde partij).

## 3. Cookies, consent, attributie

- Geen `domain`-attribuut: `mb_attributie` is host-only (`path=/; max-age=…; SameSite=Lax; Secure`). Consent zit in `localStorage` (`montagebaas_consent`), de conversievlag in `sessionStorage`. Alles is gebonden aan de origin.
- Na de wissel:
  - Iedere bezoeker krijgt de cookiebalk opnieuw. Tot iemand accepteert, staat Consent Mode op denied.
  - Een eerdere advertentieklik in `mb_attributie` op montagebaas.com is weg. Komt iemand later rechtstreeks terug op dekeukenheld.nl, dan heeft de lead geen gclid. Nieuwe klikken gaan goed, mits de 301 de querystring meeneemt.
  - GA4 `_ga` begint opnieuw: GA4 telt iedereen als nieuwe gebruiker.
  - Een lopende intake (sessionStorage) overleeft de domeinwissel niet. Alleen relevant op het moment van overstappen.
- Gevolg voor Ads: `ADS_UITSLUITEN_STANDAARD` (`ads-conversies.ts:91`) moet `@dekeukenheld.nl` erbij krijgen, anders gaan testleads met dat adres naar Ads.

## 4. Mail

- Resend via `fetch` in `src/lib/notify.ts`. Afzender = `RESEND_FROM_EMAIL` (lokaal `Montagebaas <noreply@montagebaas.com>`, op Production gezet, niet op Preview). Reply-to klantmails = `LEAD_NOTIFY_TO ?? site.email`. Mails aan Ilja gaan naar `LEAD_NOTIFY_TO` (lokaal me@ilja.com).
- Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `LEAD_NOTIFY_TO`, `PLANNER_MONITOR_TO`. `RESEND_REPLY_TO` wordt niet gebruikt.
- Het Resend-account van Montagebaas is een apart gratis account met één geverifieerd domein (montagebaas.com). Gratis Resend staat één domein per account toe. Voor dekeukenheld.nl is dus een betaald plan nodig, of een nieuw gratis account met een eigen `RESEND_API_KEY`. Dat moet in LIVEGANG.md.
- Onderwerpen klantmails: "Bedankt voor je aanvraag bij {site.naam}" (formulier), "Je prijsindicatie voor je IKEA-keuken" / "Plan ontvangen — …" (tekening), "Ontwerp ontvangen — …" / "Aanvraag ontvangen — …" (planner-link). Alleen de eerste noemt het merk.

## 5. Merkconfig nu

- `MERKEN = [montagebaas]`. `merkVoorHost(host)` bestaat, maar wordt nergens aangeroepen. `huidigMerk()` geeft altijd `MERKEN[0]`, bewust zonder `headers()` zodat pagina's statisch blijven.
- `Merk.id` is als type vastgezet op `"montagebaas"`. Velden: naam, hosts, url, accent, telefoon, whatsapp, email, kvk, adres, werkgebied, reviews. Geen afzender, logo, iconen, `alternateName`, juridische naam of footertekst.
- **Probleem voor `MERK`:** `HeaderV2`, `Header` en `TekeningIndicatie` zijn clientcomponenten die `huidigMerk()`/`site` importeren. `process.env.MERK` bestaat in de browser niet, dus de client valt terug op Montagebaas: verkeerd logo na hydratatie plus een hydratatiefout. Twee oplossingen: (a) server leest `MERK` en geeft het merk als prop door aan clientcomponenten, of (b) `NEXT_PUBLIC_MERK` (wordt bij de build ingebakken; wisselen kost een redeploy, maar die zit al in het plan). Mijn voorkeur is (a): de naam blijft `MERK` zoals in de opdracht, en er komt geen merkconfig in de clientbundel die daar niet hoeft.

## 6. Migratie

Volgende nummer: **0019**. Laatste op main is `0018_redesign_intake.sql`. Geen andere branch of worktree claimt 0019. Open PR's #1 (eigen Supabase-project) en #2 (keepalive) zijn van september en voegen geen migraties toe. `lead_overzicht` is laatst opnieuw gedefinieerd in 0018; 0019 moet die view volledig herhalen met `merk` achteraan.

## Tegenstrijdigheden en open vragen

1. **Juridische naam voor de footer**: staat nergens in de repo. Wat is de naam onder KvK 74579320? (Werkspot-profiel heet "Hout & Nieuw", Google "Montagebaas - TVMuur.com"; ik gok niet.)
2. **Reviewregel "(als Montagebaas)"**: klopt niet voor Werkspot. Daar staan de 31 reviews onder "Hout & Nieuw", op Google onder "Montagebaas - TVMuur.com". Voorstel: "4,9 uit 56 reviews op Google en Werkspot (onder onze vorige namen)", of de exacte namen noemen.
3. **Gmail-concepten van Schakel 3**: die bestaan niet. Je koos op 23-07 voor geen Gmail-integratie; Schakel 3 levert alleen tekst via de owner-mail. Ik ga ervan uit dat er niets te doen is.
4. **"Geen hostname-logica"** tegenover `MERK` in clientcomponenten: zie §5, keuze (a) of (b).
5. **`NEXT_PUBLIC_SITE_URL`** staat op Production én Preview op montagebaas.com. Voorstel: in de code wint het merkdomein, en `NEXT_PUBLIC_SITE_URL` blijft alleen een override voor lokaal. Op de overstapdag de env weghalen of aanpassen (komt in LIVEGANG.md).
6. **Resend één domein per gratis account**: zie §4. Besluit nodig: betaald plan of tweede account.
7. **Google-review-link** zoekt op "Montagebaas - TVMuur.com". Na de naamswijziging van het Bedrijfsprofiel (stap 11) vindt die zoek-URL niets meer. Beter een vaste link (place-id / g.page). Kun je die aanleveren?
8. **"Werkt op licht en donker"** (`logo-beeldmerk.png`): de figuur is grotendeels zwart met een dunne witte rand. Op donker valt hij weg. De header is licht, dus voor nu geen probleem.
9. **Manifest en OG-afbeelding** bestaan nu niet. Ik voeg ze via de merkconfig toe voor beide merken. Montagebaas krijgt geen OG-afbeelding (er is er geen), alleen een manifest met de bestaande iconen. Klopt dat met "geen visuele wijziging"?
10. **v1-site**: `site.ts` voedt ook de oude Header/Footer (`SITE_VERSIE=v1`). Ik maak `site.ts` merkbewust, dus terugdraaien naar v1 met `MERK=keukenheld` toont ook de nieuwe naam (met het oude tekstlogo). Opruimen van v1 staat los gepland rond 08-11.
11. Lokale `main` in `../montagebaas` loopt 18 commits achter op origin/main. De worktree is vanaf origin/main gemaakt.
