-- Montagebaas — attributie per aanvraag (schakel 3)
-- Draait in schema `montagebaas`. Idempotent.
--
-- Slaat op waar de bezoeker vandaan kwam. De klik-identifier komt uit de URL en
-- wordt bewaard in een EIGEN first-party cookie (zie src/lib/attributie.ts) — er
-- komt geen Google-script aan te pas. Dat is bewust: uit de meting van 28 juni t/m
-- 10 augustus bleek dat 7 van de 8 ontbrekende conversies bezoekers waren die
-- volledig onzichtbaar zijn in GA4 (geen enkele paginaweergave). Voor precies
-- die groep werkt een eigen cookie wél, want adblockers blokkeren het script
-- van googletagmanager.com, niet je eigen document.cookie.
--
-- ga_client_id is de tegenhanger: die kán alleen gevuld worden als gtag.js wél
-- draaide. Het verschil tussen "gclid gevuld" en "ga_client_id gevuld" is
-- daarmee de noemer waarmee je de omvang van de geblokkeerde groep meet.

-- gclid / gbraid / wbraid zijn ALTERNATIEVEN van elkaar, geen aanvullingen:
-- Google stuurt per klik precies één identifier mee. gbraid en wbraid komen bij
-- iOS-verkeer waar app-naar-web niet met een gclid te volgen is. Zonder die twee
-- zou een echte advertentieklik als lege gclid in de data belanden en ten
-- onrechte meetellen als "bezoeker met geblokkeerde tracking".
alter table montagebaas.aanvragen
  add column if not exists gclid         text,
  add column if not exists gbraid        text,
  add column if not exists wbraid        text,
  add column if not exists utm_source    text,
  add column if not exists utm_medium    text,
  add column if not exists utm_campaign  text,
  add column if not exists utm_term      text,
  add column if not exists utm_content   text,
  add column if not exists landing_page  text,
  add column if not exists referrer      text,
  add column if not exists ga_client_id  text;

-- Voor het terugzoeken van klikken bij een offline conversion import naar
-- Google Ads. Partieel: alleen rijen mét een identifier zijn interessant.
create index if not exists aanvragen_gclid_idx
  on montagebaas.aanvragen (gclid)
  where gclid is not null;

create index if not exists aanvragen_gbraid_idx
  on montagebaas.aanvragen (gbraid)
  where gbraid is not null;

create index if not exists aanvragen_wbraid_idx
  on montagebaas.aanvragen (wbraid)
  where wbraid is not null;
