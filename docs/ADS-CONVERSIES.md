# Gewonnen opdrachten terug naar Google Ads

Dagelijkse upload van offline conversies (enhanced conversions for leads) naar
Google Ads via de **Data Manager API** (`events:ingest`). Bron: `montagebaas.aanvragen`.

## Hoe het werkt

| Onderdeel | Waar |
|---|---|
| Consent-kolommen, uploadtabel, werkvoorraad-view | `supabase/migrations/0007_ads_conversies.sql`, `0008_ads_aanvraag_ontvangen.sql` |
| Normaliseren, hashen, beslissen, request bouwen (puur, getest) | `src/lib/ads-conversies.ts` + `.test.ts` |
| Service-account-token (JWT → access token) | `src/lib/google-auth.ts` |
| Orkestratie (view → API → `ads_conversie_uploads`) | `src/lib/ads-conversies-job.ts` |
| Cron-ingang | `src/app/api/cron/ads-conversies/route.ts`, schema in `vercel.json` |
| Admin: bedrag verplicht bij conversiestatus, kolom "Ads" | `src/app/admin/leads/*` |

Drie conversieacties:

| Actie | Moment | Waarde |
|---|---|---|
| `aanvraag_ontvangen` | `created_at` van de aanvraag (alleen aanvragen vanaf 23-10-2026, geen backfill) | `prijs_indicatie_max` |
| `offerte_verstuurd` | eerste `lead_status_log.naar_status = 'offerte_verstuurd'` | `offerte_bedrag` |
| `opdracht_gewonnen` | eerste `naar_status in ('gewonnen','uitgevoerd')` | `coalesce(gefactureerd_bedrag, offerte_bedrag)` |

`aanvraag_ontvangen` wordt direct na de insert verstuurd (`after()`, async, raakt de
formulierrespons niet; op het upload-pad pas zodra de tekening-verwerker een
prijsindicatie heeft). Wat daar niet lukt, pakt de dagelijkse cron op.

`transactionId` = `{aanvraag_id}:{actie}`, dus een tweede upload van dezelfde rij
dedupliceert aan Google's kant én wordt door de `unique`-constraint hier tegengehouden.

Overslaan (status `overgeslagen` + reden): waarde ontbreekt/0; geen click-ID én geen
bruikbare e-mail/telefoon; klik ouder dan 90 dagen op het conversiemoment (alleen bij
click-ID; `created_at` van de aanvraag geldt als benadering van het klikmoment);
**consent geweigerd** (de bezoeker klikte "Weigeren" — dan gaat er niets naar Google,
ook geen klik-ID; zo belooft de cookiebanner het).

## Eenmalige inrichting (Ilja)

### 1. Conversieacties in Google Ads (account 339-583-6845)

Doelen → Conversies → Samenvatting → **+ Nieuwe conversieactie** → **Importeren** →
**CRM's, bestanden of andere gegevensbronnen** → **Conversies van klikken bijhouden**.
Bij "Gegevensbron": **Nieuwe gegevensbron koppelen** → **Directe verbinding** (API).
Vink de EU-gebruikerstoestemming en het klantgegevensbeleid aan (vereist voor
enhanced conversions for leads).

| Naam | Doel | Waarde | Telling | Rol |
|---|---|---|---|---|
| `aanvraag_ontvangen` | Lead verzenden (Submit lead form) | Verschillende waarden per conversie, standaard 0, EUR | Eén | **Secundair** |
| `offerte_verstuurd` | Gekwalificeerde lead | Verschillende waarden per conversie, standaard 0, EUR | Eén | **Secundair** |
| `opdracht_gewonnen` | Geconverteerde lead | Verschillende waarden per conversie, standaard 0, EUR | Eén | **Secundair** |

Alle drie **secundair** aanmaken; `offerte_aanvraag` (tag) blijft voorlopig primair.

**`aanvraag_ontvangen` versus de tag-conversie `offerte_aanvraag`.** Ze meten hetzelfde
moment, maar via twee wegen (tag in de browser versus API vanuit de database). Het plan:

1. `aanvraag_ontvangen` 2–4 weken secundair laten meelopen.
2. In Google Ads de aantallen en de attributie vergelijken met `offerte_aanvraag`
   (Doelen → Conversies → Samenvatting, zelfde periode).
3. Zijn de cijfers consistent, dan omwisselen: `aanvraag_ontvangen` primair,
   `offerte_aanvraag` secundair.
4. **Nooit beide primair** — dan telt elke aanvraag dubbel in de biedstrategie.

Noteer per actie de **conversion action ID** (cijfers; staat in de URL van de
conversieactie als `ctId=…`, of in de kolom "ID" van het overzicht). Die gaan in
`ADS_CONVERSIE_ACTIE_OFFERTE_VERSTUURD` en `ADS_CONVERSIE_ACTIE_OPDRACHT_GEWONNEN`.

### 2. Google Cloud: service account

1. Google Cloud-project kiezen/aanmaken → **APIs & Services** → **Data Manager API** inschakelen.
2. **IAM & Admin → Service accounts → Create service account**, bv. `montagebaas-ads-upload`.
3. Rol op het project: **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`).
4. Service account → **Keys → Add key → JSON**. Download de JSON.
5. Google Ads → **Beheer → Toegang en beveiliging → +** → het e-mailadres van het
   service account (`…@…iam.gserviceaccount.com`) met toegangsniveau **Standaard**.
   Loopt het account onder een manager-account (MCC)? Voeg het daar toe en zet
   `ADS_LOGIN_CUSTOMER_ID` op het MCC-nummer.

### 3. Omgevingsvariabelen (Vercel: Production + Preview, en lokaal in `.env.local`)

| Variabele | Waarde |
|---|---|
| `CRON_SECRET` | willekeurige string (`openssl rand -hex 32`); Vercel stuurt hem als `Authorization: Bearer` |
| `GOOGLE_SA_KEY_JSON` | inhoud van het sleutelbestand, als base64: `base64 -i key.json \| tr -d '\n'` |
| `ADS_CUSTOMER_ID` | `339-583-6845` (streepjes mogen) |
| `ADS_LOGIN_CUSTOMER_ID` | alleen bij MCC |
| `ADS_CONVERSIE_ACTIE_AANVRAAG_ONTVANGEN` | conversion action ID |
| `ADS_CONVERSIE_ACTIE_OFFERTE_VERSTUURD` | conversion action ID |
| `ADS_CONVERSIE_ACTIE_OPDRACHT_GEWONNEN` | conversion action ID |
| `ADS_CONSENT_ONBEKEND` | `wachten` (standaard), `overslaan` of `unspecified` — zie hieronder |

### 4. Consent zonder vastgelegde keuze

De bannerkeuze reist sinds 0007 mee met elke aanvraag (`consent_ad_user_data`,
`consent_ad_personalization`). Rijen van vóór die migratie, en aanvragen waarbij
de bezoeker nog geen keuze had gemaakt, hebben `null`. `ADS_CONSENT_ONBEKEND` bepaalt
wat daarmee gebeurt:

- `wachten` (standaard): niet versturen, rij blijft in de werkvoorraad;
- `overslaan`: definitief niet versturen;
- `unspecified`: versturen met `CONSENT_STATUS_UNSPECIFIED`.

### 5. Consent-bron

`aanvragen.consent_bron` (0009) zegt hoe de keuze tot stand kwam: `banner` (cookiebalk) of
`formulier` (vooraf aangevinkte checkbox boven de verzendknop, alleen getoond zonder
bannerkeuze; aangevinkt = accepteren, uitgevinkt = weigeren). De kolom zit ook in de
werkvoorraad-view, zodat je de formulier-groep later apart kunt behandelen of uitsluiten.

## Draaien

Cron: dagelijks `13 5 * * *` UTC (06:13 CET, 07:13 CEST; Vercel-crons kennen geen tijdzone).

Handmatig, met `CRON_SECRET` uit de env:

```bash
# alleen rapport, niets versturen, niets wegschrijven
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://montagebaas.com/api/cron/ads-conversies?mode=plan" | jq
# validateOnly naar Google, niets wegschrijven
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://montagebaas.com/api/cron/ads-conversies?mode=validate" | jq
# echte upload (= wat de cron doet)
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://montagebaas.com/api/cron/ads-conversies?mode=verzend" | jq
```

Lokaal werkt hetzelfde tegen `http://localhost:3000` met `npm run dev`.

## Controle achteraf

- `ads_conversie_uploads`: status per (aanvraag, actie), met `request_id` en de ruwe `response`.
- Google Ads: Doelen → Conversies → Samenvatting → conversieactie → **Diagnostiek**.
  Verwerking duurt tot 24–48 uur. Daar staan het aantal geïmporteerde events en het
  matchpercentage van de user-provided data.
- API: `GET https://datamanager.googleapis.com/v1/requestStatus:retrieve?requestId=…`
  met hetzelfde token geeft de verwerkingsstatus per bestemming.

## Buiten scope

GA4 Measurement Protocol, Werkspot-leads, primair maken van de nieuwe acties, UTM final URL suffix.
