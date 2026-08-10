-- Montagebaas — attributie per aanvraag (schakel 3)
-- Draait in schema `montagebaas`. Idempotent.
--
-- Slaat op waar de bezoeker vandaan kwam. De gclid komt uit de URL en wordt
-- bewaard in een EIGEN first-party cookie (zie src/lib/attributie.ts) — er komt
-- geen Google-script aan te pas. Dat is bewust: uit de meting van 28 juni t/m
-- 10 augustus bleek dat 7 van de 8 ontbrekende conversies bezoekers waren die
-- volledig onzichtbaar zijn in GA4 (geen enkele paginaweergave). Voor precies
-- die groep werkt een eigen cookie wél, want adblockers blokkeren het script
-- van googletagmanager.com, niet je eigen document.cookie.
--
-- ga_client_id is de tegenhanger: die kán alleen gevuld worden als gtag.js wél
-- draaide. Het verschil tussen "gclid gevuld" en "ga_client_id gevuld" is
-- daarmee de noemer waarmee je de omvang van de geblokkeerde groep meet.

alter table montagebaas.aanvragen
  add column if not exists gclid         text,
  add column if not exists utm_source    text,
  add column if not exists utm_medium    text,
  add column if not exists utm_campaign  text,
  add column if not exists utm_term      text,
  add column if not exists utm_content   text,
  add column if not exists landing_page  text,
  add column if not exists referrer      text,
  add column if not exists ga_client_id  text;

-- Voor het terugzoeken van klikken bij een offline conversion import naar
-- Google Ads. Partieel: alleen rijen mét gclid zijn interessant.
create index if not exists aanvragen_gclid_idx
  on montagebaas.aanvragen (gclid)
  where gclid is not null;
