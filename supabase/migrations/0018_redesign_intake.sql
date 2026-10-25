-- 0018_redesign_intake.sql
-- Nieuwe intake op de homepage (redesign). Alleen toevoegen, niets verwijderen.
--
-- 1. aanvragen: welke siteversie de aanvraag deed, welk pakket en of demontage
--    gekozen is, en de indicatie die de klant op het scherm zag. De route zelf
--    staat al in invoermethode (0013): formulier = vragenroute, pdf/foto = PDF,
--    link = IKEA-link.
-- 2. planner_snapshots: een link wordt nu vóór het verzenden gelezen
--    (/api/ontwerp-lezen), dus de snapshot bestaat even zonder aanvraag. Bij
--    verzenden koppelt de link-route hem eenmalig via lees_token. De inhoud blijft
--    onveranderlijk: service_role krijgt alleen update op aanvraag_id.
-- 3. lead_overzicht: de nieuwe kolommen achteraan.
--
-- Nummer 0017 is van de dagenmodel-PR (tarieven); deze migratie raakt tarieven niet.

begin;

-- ---------------------------------------------------------------------------
-- 1. aanvragen
-- ---------------------------------------------------------------------------

alter table montagebaas.aanvragen
  add column site_versie        text check (site_versie in ('v1-oud', 'v2-redesign')),
  add column pakket_gekozen     text check (pakket_gekozen in ('compleet', 'montageklaar')),
  add column demontage_gekozen  boolean,
  -- Exact wat de klant zag, incl. btw. Bij een vaste prijs zijn beide gelijk;
  -- null als er geen bedrag getoond is (bv. link met TOON_PRIJS_BIJ_LINK uit).
  add column prijs_getoond_laag numeric(10, 2),
  add column prijs_getoond_hoog numeric(10, 2),
  add constraint aanvragen_prijs_getoond_check check (
    (prijs_getoond_laag is null) = (prijs_getoond_hoog is null)
    and (prijs_getoond_laag is null or prijs_getoond_laag <= prijs_getoond_hoog)
  );

-- Alles van vóór deze migratie kwam van de oude site. Geen default: de app
-- schrijft de versie expliciet (v2-redesign nieuw, v1-oud vanaf /offerte-oud).
update montagebaas.aanvragen set site_versie = 'v1-oud' where site_versie is null;

create index aanvragen_site_versie_idx on montagebaas.aanvragen (site_versie);

-- ---------------------------------------------------------------------------
-- 2. planner_snapshots: lezen vóór de lead
-- ---------------------------------------------------------------------------

alter table montagebaas.planner_snapshots
  alter column aanvraag_id drop not null,
  add column lees_token uuid unique,
  add constraint planner_snapshots_koppeling_check check (aanvraag_id is not null or lees_token is not null);

-- Koppelen bij verzenden: update ... set aanvraag_id = $1
--   where lees_token = $2 and aanvraag_id is null and ontwerp_uuid = $3
grant update (aanvraag_id) on montagebaas.planner_snapshots to service_role;

-- ---------------------------------------------------------------------------
-- 3. lead_overzicht: nieuwe kolommen achteraan (zie 0006 en 0016)
-- ---------------------------------------------------------------------------

create or replace view montagebaas.lead_overzicht as
select
  a.id,
  a.created_at,
  a.naam,
  a.email,
  a.telefoon,
  a.lead_status,
  a.lead_status_gewijzigd_op,
  a.bron,
  a.offerte_bedrag,
  a.gefactureerd_bedrag,
  a.reden_verloren,
  coalesce(a.gclid, a.gbraid, a.wbraid) is not null as betaalde_klik,
  a.utm_source,
  a.utm_medium,
  a.utm_campaign,
  a.landing_page,
  date_trunc('month', a.created_at)::date as lead_maand,
  now() - a.lead_status_gewijzigd_op       as stil_sinds,
  a.notitie,
  a.invoermethode,
  a.planner_status,
  a.werkelijke_dagen,
  a.site_versie,
  a.pakket_gekozen,
  a.demontage_gekozen,
  a.prijs_getoond_laag,
  a.prijs_getoond_hoog
from montagebaas.aanvragen a;

commit;
