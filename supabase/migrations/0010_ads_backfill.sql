-- 0010_ads_backfill.sql
-- Backfill van historische conversies, vóór de eerste echte upload-run.
--
--  1. aanvraag_ontvangen: niet langer alleen vanaf 23-10-2026, maar elke
--     website-aanvraag van de afgelopen 90 dagen (rollend; ouder heeft voor
--     Google geen zin). created_at blijft het event-tijdstip.
--  2. tijdstip_bron krijgt een derde waarde: 'migratie'. De leadstatussen zijn
--     op 25-09-2026 in bulk geïmporteerd (lead_status_log 08:41–09:10); het
--     logtijdstip van die rijen is het importmoment, niet het echte moment van
--     offerte of opdracht. De cron zet zulke rijen op 'wachtend' tot de datum in
--     lead_status_log is gecorrigeerd — dan wordt de bron vanzelf weer 'log'.
--
-- Zelfde kolommen, zelfde types en volgorde als 0009 → create or replace volstaat.
-- Idempotent.

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
  -- aanvraag_ontvangen: binnenkomst zelf, rollend 90 dagen terug (backfill).
  select a.id, 'aanvraag_ontvangen', a.created_at, null
  from montagebaas.aanvragen a
  where a.bron = 'website'
    and a.created_at >= now() - interval '90 days'
)
select
  k.aanvraag_id,
  k.conversie_actie,
  coalesce(k.log_tijdstip, k.fallback_tijdstip) as event_tijdstip,
  case
    -- Statusimport van 25-09-2026 (Europe/Amsterdam): tijdstip is niet echt.
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
  a.consent_bron
from kandidaten k
join montagebaas.aanvragen a on a.id = k.aanvraag_id
left join montagebaas.ads_conversie_uploads u
       on u.aanvraag_id = k.aanvraag_id and u.conversie_actie = k.conversie_actie
where coalesce(k.log_tijdstip, k.fallback_tijdstip) is not null
  and (u.status is null or u.status not in ('verstuurd', 'overgeslagen'))
order by coalesce(k.log_tijdstip, k.fallback_tijdstip);

grant select on montagebaas.ads_conversies_te_versturen to service_role;
