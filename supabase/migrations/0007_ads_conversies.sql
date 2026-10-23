-- 0007_ads_conversies.sql
-- Gewonnen opdrachten (en verstuurde offertes) terugsturen naar Google Ads via
-- enhanced conversions for leads over de Data Manager API.
--
-- Drie onderdelen:
--  1. consent per aanvraag (Consent Mode-keuze op het moment van verzenden);
--  2. ads_conversie_uploads: wat is (niet) verstuurd, en waarom;
--  3. ads_conversies_te_versturen: de werkvoorraad voor de dagelijkse cron.
--
-- Idempotent: kan veilig opnieuw draaien.

-- ---------------------------------------------------------------------------
-- 1. Consent
-- ---------------------------------------------------------------------------
-- Komt uit de cookiebanner (localStorage 'montagebaas_consent'); het formulier
-- stuurt de keuze mee bij verzenden. NULL = geen keuze bekend (banner nog open,
-- of rij van vóór deze migratie). Hoe NULL richting Google gaat, is een
-- beleidskeuze — zie ADS_CONSENT_ONBEKEND in src/lib/ads-conversies.ts.
alter table montagebaas.aanvragen
  add column if not exists consent_ad_user_data        boolean,
  add column if not exists consent_ad_personalization  boolean;

-- ---------------------------------------------------------------------------
-- 2. Uploadadministratie
-- ---------------------------------------------------------------------------
create table if not exists montagebaas.ads_conversie_uploads (
  id              bigint generated always as identity primary key,
  aanvraag_id     uuid not null references montagebaas.aanvragen (id),
  conversie_actie text not null
                  check (conversie_actie in ('offerte_verstuurd', 'opdracht_gewonnen')),
  event_tijdstip  timestamptz not null,
  waarde          numeric not null,
  status          text not null default 'wachtend'
                  check (status in ('wachtend', 'verstuurd', 'fout', 'overgeslagen')),
  reden           text,
  request_id      text,
  response        jsonb,
  verzonden_op    timestamptz,
  unique (aanvraag_id, conversie_actie)
);

create index if not exists ads_conversie_uploads_status_idx
  on montagebaas.ads_conversie_uploads (status);

-- Zelfde patroon als lead_status_log (0005/0006): alleen service_role, en de
-- identity-sequence expliciet meegeven — anders faalt elke insert.
grant select, insert, update, delete on montagebaas.ads_conversie_uploads to service_role;
grant usage, select on sequence montagebaas.ads_conversie_uploads_id_seq to service_role;
alter table montagebaas.ads_conversie_uploads enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Werkvoorraad
-- ---------------------------------------------------------------------------
-- Eén rij per (aanvraag, actie). Het event-tijdstip is het EERSTE moment in
-- lead_status_log waarop de doelstatus bereikt werd. Ontbreekt zo'n logregel
-- terwijl de huidige status wél de doelstatus is (rijen van vóór 0005), dan
-- geldt lead_status_gewijzigd_op als fallback (tijdstip_bron = 'fallback').
--
-- De cron beslist zelf over overslaan (waarde 0, geen identifier, klik te oud,
-- consent onbekend) — hier staat alles wat in principe in aanmerking komt.
-- Klikmoment: we slaan het moment van de klik niet op; created_at van de
-- aanvraag is de bovengrens en dient als benadering voor de 90-dagenregel.
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
)
select
  k.aanvraag_id,
  k.conversie_actie,
  coalesce(k.log_tijdstip, k.fallback_tijdstip) as event_tijdstip,
  case when k.log_tijdstip is not null then 'log' else 'fallback' end as tijdstip_bron,
  case k.conversie_actie
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
