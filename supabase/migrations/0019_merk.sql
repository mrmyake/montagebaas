-- 0019_merk.sql
-- Merkwissel naar De Keukenheld. Alleen toevoegen, niets verwijderen.
--
-- 1. aanvragen.merk: onder welk merk de aanvraag binnenkwam. Default montagebaas:
--    bestaande rijen en alles wat de huidige productiecode schrijft is Montagebaas.
--    De nieuwe code schrijft het actieve merk (env MERK) expliciet mee.
-- 2. lead_overzicht: merk achteraan (definitie verder gelijk aan 0018).

begin;

-- ---------------------------------------------------------------------------
-- 1. aanvragen
-- ---------------------------------------------------------------------------

alter table montagebaas.aanvragen
  add column merk text not null default 'montagebaas' check (merk in ('montagebaas', 'keukenheld'));

-- ---------------------------------------------------------------------------
-- 2. lead_overzicht: merk achteraan (zie 0018)
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
  a.prijs_getoond_hoog,
  a.merk
from montagebaas.aanvragen a;

commit;
