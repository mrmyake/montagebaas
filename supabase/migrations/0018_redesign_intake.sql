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
-- 4. ads_conversies_te_versturen: naam achteraan, zodat beslis() testinzendingen
--    ("test" in de naam) overslaat, naast ADS_UITGESLOTEN_CONTACTEN. Verder
--    gelijk aan 0014.
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

-- ---------------------------------------------------------------------------
-- 4. ads_conversies_te_versturen: naam achteraan (definitie verder gelijk aan 0014)
-- ---------------------------------------------------------------------------

create or replace view montagebaas.ads_conversies_te_versturen as
with doel as (
  select 'offerte_verstuurd'::text as conversie_actie,
         array['offerte_verstuurd']::montagebaas.lead_status[] as statussen
  union all
  select 'opdracht_gewonnen',
         array['gewonnen', 'uitgevoerd']::montagebaas.lead_status[]
),
kandidaten as (
  select
    a.id as aanvraag_id,
    d.conversie_actie,
    (select min(l.gewijzigd_op)
       from montagebaas.lead_status_log l
      where l.aanvraag_id = a.id
        and l.naar_status = any (d.statussen)) as log_tijdstip,
    case
      when a.lead_status = any (d.statussen) then a.lead_status_gewijzigd_op
    end as fallback_tijdstip
  from montagebaas.aanvragen a
  cross join doel d
  where a.bron = 'website'
  union all
  -- aanvraag_ontvangen: binnenkomst zelf, rollend 90 dagen terug (0010).
  select a.id, 'aanvraag_ontvangen', a.created_at, null
  from montagebaas.aanvragen a
  where a.bron = 'website'
    and a.created_at >= now() - interval '90 days'
),
contact as (
  select id, created_at,
         lower(trim(email)) as em,
         montagebaas.normaliseer_telefoon(telefoon) as tel
  from montagebaas.aanvragen
  where bron = 'website'
),
-- Vroegste eerdere aanvraag binnen 7 dagen met hetzelfde contact (0011).
duplicaat as (
  select a.id as aanvraag_id,
         (select b.id from contact b
           where b.id <> a.id
             and (b.created_at < a.created_at or (b.created_at = a.created_at and b.id < a.id))
             and a.created_at - b.created_at <= interval '7 days'
             and ((a.em <> '' and a.em = b.em) or (a.tel is not null and a.tel = b.tel))
           order by b.created_at, b.id
           limit 1) as duplicaat_van
  from contact a
)
select
  k.aanvraag_id,
  k.conversie_actie,
  coalesce(k.log_tijdstip, k.fallback_tijdstip) as event_tijdstip,
  case
    -- Statusimport van 25-09-2026 (Europe/Amsterdam): tijdstip is niet echt (0010).
    when k.conversie_actie <> 'aanvraag_ontvangen'
     and coalesce(k.log_tijdstip, k.fallback_tijdstip) >= timestamptz '2026-09-25 00:00:00+02'
     and coalesce(k.log_tijdstip, k.fallback_tijdstip) <  timestamptz '2026-09-26 00:00:00+02'
      then 'migratie'
    when k.log_tijdstip is not null then 'log'
    else 'fallback'
  end as tijdstip_bron,
  case k.conversie_actie
    when 'aanvraag_ontvangen' then null  -- vaste waarde ADS_LEAD_WAARDE, zie beslis()
    when 'offerte_verstuurd' then a.offerte_bedrag
    else coalesce(a.gefactureerd_bedrag, a.offerte_bedrag)
  end as waarde,
  a.created_at,
  a.lead_status,
  a.gclid,
  a.gbraid,
  a.wbraid,
  a.email,
  a.telefoon,
  a.consent_ad_user_data,
  a.consent_ad_personalization,
  u.status as upload_status,
  a.consent_bron,
  case when k.conversie_actie = 'aanvraag_ontvangen' then dup.duplicaat_van end as duplicaat_van,
  a.naam
from kandidaten k
join montagebaas.aanvragen a on a.id = k.aanvraag_id
left join duplicaat dup on dup.aanvraag_id = k.aanvraag_id
left join montagebaas.ads_conversie_uploads u
       on u.aanvraag_id = k.aanvraag_id and u.conversie_actie = k.conversie_actie
where coalesce(k.log_tijdstip, k.fallback_tijdstip) is not null
  and (u.status is null or u.status not in ('verstuurd', 'overgeslagen'))
order by coalesce(k.log_tijdstip, k.fallback_tijdstip);

commit;
