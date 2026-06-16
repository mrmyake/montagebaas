# Montagebaas — setup & overdracht

Korte handleiding om de site live te krijgen. De code is af (Fase 0–5); dit zijn de
acties die de eigenaar nog moet doen.

## 1. Supabase (gedeeld project, schema `montagebaas`)

De database draait in het gedeelde Supabase-project, geïsoleerd in schema `montagebaas`.
De migratie is al uitgevoerd en de `steden`-tabel is gevuld (16 steden).

**Nog te doen — verplicht voor het opslaan van leads:**
1. Ga in Supabase naar **Settings → API → Exposed schemas** en voeg **`montagebaas`** toe
   (naast `public`, `tvmuur`, …). Zonder deze stap weigert de app met `Invalid schema`.
2. Verifieer daarna lokaal: `node scripts/verify-db.mjs` — de `[supabase-js]`-regel moet nu `ok` zijn.

Handige scripts (gebruiken `DATABASE_URL` uit `.env.local`):
- `node scripts/run-migration.mjs supabase/migrations/0001_init.sql` — (her)maak schema/tabellen
- `node scripts/seed-steden.mjs` — vul/refresh de `steden`-tabel
- `node scripts/verify-db.mjs` — test insert via Postgres én via de app-route

## 2. Omgevingsvariabelen

`.env.local` staat lokaal klaar met de gedeelde Supabase-keys. Zet dezelfde variabelen in
**Vercel** (Project Settings → Environment Variables). Zie `.env.local.example` voor de volledige lijst.

Nog in te vullen:
- `MAILERSEND_API_KEY`, `MAILERSEND_FROM_EMAIL` (binnen geverifieerd MailerSend-domein), `LEAD_NOTIFY_TO`
  — zonder deze wordt de lead wél opgeslagen, maar krijg je geen e-mail.
- (optioneel) `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_ADS_CONVERSION_LABEL` voor analytics/conversie.

> Let op: de andere sites gebruiken **Resend**. Hier is **MailerSend** ingebouwd (`src/lib/notify.ts`).
> Wil je toch Resend, dan is dat bestand het enige dat hoeft te wijzigen.

## 3. Bedrijfsgegevens & content (placeholders → echt)

Zoek op `TODO_EIGENAAR` in de code. Belangrijkste:
- `src/lib/site.ts` — telefoon, WhatsApp-nummer, e-mail, KvK. (Nu placeholders, o.a. `wa.me/31600000000`.)
- `src/lib/pricing.ts` — **kalibreer de prijzen met echte kostprijzen vóór livegang.**
- `src/components/sections/Hero.tsx` — voorbeeldcitaat vervangen door echte review.
- `src/app/reviews/page.tsx` — vul echte reviews en zet `site.hasReviews` op `true`.
  Gebruik nooit nep-reviews of nep-AggregateRating.
- `src/app/privacy/page.tsx` — juridisch laten controleren.

## 4. Steden uitbreiden

Voeg steden toe in `src/lib/steden.ts` (elke `intro` uniek schrijven — geen dunne content!).
Ze verschijnen automatisch op `/werkgebied`, in de sitemap en als `/keukenmonteur/[slug]`.
Claim alleen steden waar je daadwerkelijk een monteur hebt.

## 5. Deploy

- GitHub-repo `montagebaas` is aangemaakt — koppel deze map en push.
- Koppel het project in Vercel, zet de env-vars, en deploy.
- Domein `montagebaas.com` koppelen in Vercel; `dekeukenheld.nl` kan later naar dezelfde site wijzen.

## 6. Na livegang

- Vraag vanaf klant 1 om Google-reviews (vertrouwen is de bottleneck, niet de site).
- Controleer de schema.org met de Rich Results Test.
- Dien `sitemap.xml` in bij Google Search Console.
