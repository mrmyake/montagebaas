# /admin/offerte

Interne offerte-tool: planner-link (of PDF) → telling, signalen, prijzen → twee mailvarianten → Gmail-draft in de mailbox ilja@montagebaas.com met afzender ilja@dekeukenheld.nl. Nooit automatisch versturen.

dekeukenheld.nl is een aliasdomein in de montagebaas.com-Workspace. Koppelen gebeurt met **ilja@montagebaas.com** (dat account staat in `integraties`). Bij het koppelen én bij elke draft controleert de tool via `users.settings.sendAs.list` of ilja@dekeukenheld.nl als verzendadres bestaat; zo niet, dan een melding en geen draft.

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
| `GMAIL_CLIENT_ID` | OAuth-client (web) uit Google Cloud, project onder de montagebaas.com-Workspace (consent screen Intern) |
| `GMAIL_CLIENT_SECRET` | idem |
| `INTEGRATIES_SLEUTEL` | `openssl rand -base64 32`; versleutelt de refresh-token in `montagebaas.integraties` |
| `GMAIL_ACCOUNT` | optioneel: de mailbox, standaard `ilja@montagebaas.com` |
| `GMAIL_AFZENDER` | optioneel: From-adres (sendAs-alias), standaard `ilja@dekeukenheld.nl` |

Redirect-URI = `<domein waarop je de tool opent>/admin/offerte/gmail/callback`. Google kent geen wildcards: alleen productie en de vaste branch-preview werken.

## Tests

- `npm test`: afronding, toeslagen, pakketverschil, signalen, mailregels, MIME/OAuth, versleuteling, `beslis()` voor admin_link.
- `ADS_VIEW_DB_URL=… node --test src/lib/ads-admin-link.db.test.ts`: de echte view, in een transactie met ROLLBACK.
- Screenshots van de e2e-run met de MB monitor-link staan in deze map.
