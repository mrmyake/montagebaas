-- 0008_ads_aanvraag_ontvangen.sql
-- Derde conversieactie voor Google Ads: aanvraag_ontvangen — elke website-
-- aanvraag, op het moment van binnenkomst, met de prijsindicatie (max) als
-- waarde. Geen backfill: alleen aanvragen vanaf 23-10-2026. Wordt direct na de
-- insert verstuurd (async) en anders door de dagelijkse cron opgepakt.
-- Idempotent.

alter table montagebaas.ads_conversie_uploads
  drop constraint if exists ads_conversie_uploads_conversie_actie_check;
alter table montagebaas.ads_conversie_uploads
  add constraint ads_conversie_uploads_conversie_actie_check
  check (conversie_actie in ('aanvraag_ontvangen', 'offerte_verstuurd', 'opdracht_gewonnen'));

-- Kolomtype van `waarde` verandert (numeric(10,2) → numeric), dus drop + create.
drop view if exists montagebaas.ads_conversies_te_versturen;
create view montagebaas.ads_conversies_te_versturen as
with doel as (
  select 'offerte_verstuurd'::text as conversie_actie,
         array['offerte_verstuurd']::montagebaas.lead_status[] as statussen
  union all
  select 'opdracht_gewonnen',
         array['gewonnen', 'uitgevoerd']::montagebaas.lead_status[]
),
kandidaten as (
  -- Statusgedreven acties: eerste logmoment, anders fallback (zie 0007).
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
  -- aanvraag_ontvangen: binnenkomst zelf, vanaf livegang (geen backfill).
  select a.id, 'aanvraag_ontvangen', a.created_at, null
  from montagebaas.aanvragen a
  where a.bron = 'website'
    and a.created_at >= timestamptz '2026-10-23 00:00:00+02'
)
select
  k.aanvraag_id,
  k.conversie_actie,
  coalesce(k.log_tijdstip, k.fallback_tijdstip) as event_tijdstip,
  case when k.log_tijdstip is not null then 'log' else 'fallback' end as tijdstip_bron,
  case k.conversie_actie
    when 'aanvraag_ontvangen' then a.prijs_indicatie_max
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
  u.status as upload_status
from kandidaten k
join montagebaas.aanvragen a on a.id = k.aanvraag_id
left join montagebaas.ads_conversie_uploads u
       on u.aanvraag_id = k.aanvraag_id and u.conversie_actie = k.conversie_actie
where coalesce(k.log_tijdstip, k.fallback_tijdstip) is not null
  and (u.status is null or u.status not in ('verstuurd', 'overgeslagen'))
order by coalesce(k.log_tijdstip, k.fallback_tijdstip);

grant select on montagebaas.ads_conversies_te_versturen to service_role;
