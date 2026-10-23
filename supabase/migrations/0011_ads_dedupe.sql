-- 0011_ads_dedupe.sql
-- Dubbele aanvragen tellen voor aanvraag_ontvangen als één. Twee website-
-- aanvragen met hetzelfde e-mailadres (lowercase) of telefoonnummer (alleen
-- cijfers) binnen 7 dagen: alleen de eerste gaat naar Google Ads, de latere
-- krijgt duplicaat_van = id van de eerdere en wordt door de cron overgeslagen
-- met reden 'duplicaat van <kort id>'. Geldt voor backfill én nieuwe aanvragen
-- (de directe upload leest dezelfde view). Alleen gevuld bij aanvraag_ontvangen.
--
-- Nieuwe kolom achteraan → create or replace volstaat. Idempotent.

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
         regexp_replace(coalesce(telefoon, ''), '\D', '', 'g') as tel
  from montagebaas.aanvragen
  where bron = 'website'
),
-- Vroegste eerdere aanvraag binnen 7 dagen met hetzelfde contact.
duplicaat as (
  select a.id as aanvraag_id,
         (select b.id from contact b
           where b.id <> a.id
             and (b.created_at < a.created_at or (b.created_at = a.created_at and b.id < a.id))
             and a.created_at - b.created_at <= interval '7 days'
             and ((a.em <> '' and a.em = b.em) or (a.tel <> '' and a.tel = b.tel))
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
  u.status as upload_status,
  a.consent_bron,
  case when k.conversie_actie = 'aanvraag_ontvangen' then dup.duplicaat_van end as duplicaat_van
from kandidaten k
join montagebaas.aanvragen a on a.id = k.aanvraag_id
left join duplicaat dup on dup.aanvraag_id = k.aanvraag_id
left join montagebaas.ads_conversie_uploads u
       on u.aanvraag_id = k.aanvraag_id and u.conversie_actie = k.conversie_actie
where coalesce(k.log_tijdstip, k.fallback_tijdstip) is not null
  and (u.status is null or u.status not in ('verstuurd', 'overgeslagen'))
order by coalesce(k.log_tijdstip, k.fallback_tijdstip);

grant select on montagebaas.ads_conversies_te_versturen to service_role;
