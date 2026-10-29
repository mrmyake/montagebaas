# /admin/offerte

Interne offerte-tool: planner-link (of PDF) → telling, signalen, prijzen → twee mailvarianten → Gmail-draft in de mailbox ilja@dekeukenheld.nl, met die mailbox als afzender. Nooit automatisch versturen.

dekeukenheld.nl is het primaire domein van de Workspace; montagebaas.com is alias. Koppelen gebeurt met **ilja@dekeukenheld.nl** (dat account staat in `integraties`). Bij het koppelen én bij elke draft controleert de tool via `users.settings.sendAs.list` of de afzender mag: het hoofdadres (`isPrimary`) altijd, een ander adres alleen met `verificationStatus: accepted`. Zo niet, dan een melding en geen draft.

Een reply zoekt alleen in deze mailbox. Oudere klantthreads in de vroegere montagebaas-mailbox tellen niet mee; zonder treffer wordt het een nieuwe draft.

## Code

| Deel | Waar | Hergebruik |
|---|---|---|
| Extractie | `src/lib/admin-offerte/server.ts` → `analyseerLink` | `leesOntwerp` (csrf → legal-entity-token, gecachet per instance → metadata → producten), snapshot zoals `/api/ontwerp-lezen` (lees_token, koppelen bij opslaan) |
| PDF-terugval | `/admin/offerte/pdf` → `analyseerPdf` | `leesTekening` (bestaande AI-lezer), bucket `offerte-tekeningen` |
| Prijs | `src/lib/admin-offerte/prijs.ts` | `berekenPrijsUitTelling` + `rondPrijsAf` uit `rekenen.ts`; toeslagen uit `tarieven.toeslagen` |
| Signalen | `src/lib/admin-offerte/signalen.ts` | artikellijst en eiland-info uit `ikea-planner/telling.ts` |
| Mail | `src/lib/admin-offerte/mail.ts` | stijl en templates van de skill `ikea-keuken-offerte` (email.md, scope.md), met de regels van deze opdracht; `controleerMail` toetst ook bewerkte tekst |
| Gmail | `src/lib/gmail/` + `/admin/offerte/gmail/{connect,callback}` | geen dependency, `fetch` op de Gmail REST API |

## Env

| Naam | Waarde |
|---|---|
| `GMAIL_CLIENT_ID` | OAuth-client (web) uit Google Cloud, project onder de Workspace van dekeukenheld.nl (consent screen Intern) |
| `GMAIL_CLIENT_SECRET` | idem |
| `INTEGRATIES_SLEUTEL` | `openssl rand -base64 32`; versleutelt de refresh-token in `montagebaas.integraties` |
| `GMAIL_ACCOUNT` | optioneel: de mailbox, standaard `ilja@dekeukenheld.nl` |
| `GMAIL_AFZENDER` | optioneel: From-adres, standaard `ilja@dekeukenheld.nl` |

Redirect-URI = `<domein waarop je de tool opent>/admin/offerte/gmail/callback`. Google kent geen wildcards: alleen productie en de vaste branch-preview werken.

## Tests

- `npm test`: afronding, toeslagen, pakketverschil, signalen, mailregels, MIME/OAuth, versleuteling, `beslis()` voor admin_link.
- `ADS_VIEW_DB_URL=… node --test src/lib/ads-admin-link.db.test.ts`: de echte view, in een transactie met ROLLBACK.
- Screenshots van de e2e-run met de MB monitor-link staan in deze map.
