-- 0020_admin_offerte.sql
-- Interne offerte-tool /admin/offerte. Alleen toevoegen, niets verwijderen.
--
-- 1. invoermethode 'admin_link': aanvragen die Ilja zelf aanmaakt vanuit een
--    planner-link die hij buiten de site kreeg.
--    lead_bron + 'email', 'whatsapp', 'telefoon': de bronkeuze in /admin/offerte
--    (Website, Werkspot, E-mail, WhatsApp, Telefoon, Overig). Alleen bron
--    'website' komt in ads_conversies_te_versturen; dat blijft zo.
-- 2. integraties: versleutelde refresh-token van de Gmail-koppeling. Alleen
--    service_role; RLS aan zonder policies.
-- 3. offerte_drafts: elke Gmail-draft die de tool maakt, met de prijzen en de
--    tarievenrij waarmee gerekend is. aanvraag_id is leeg tot "Opslaan als aanvraag".
-- 4. ads_conversies_te_versturen: admin_link-rijen krijgen geen aanvraag_ontvangen
--    (Ilja maakte ze zelf, het is geen binnengekomen lead). offerte_verstuurd en
--    opdracht_gewonnen blijven zoals ze zijn. invoermethode komt achteraan, zodat
--    beslis() dezelfde regel nog eens kan afdwingen. Verder gelijk aan 0018.
--
-- Let op: de nieuwe enumwaarde mag in dezelfde transactie niet gebruikt worden
-- ("unsafe use of new value"), daarom vergelijkt de view op invoermethode::text.

alter type montagebaas.invoermethode add value if not exists 'admin_link';
alter type montagebaas.lead_bron add value if not exists 'email';
alter type montagebaas.lead_bron add value if not exists 'whatsapp';
alter type montagebaas.lead_bron add value if not exists 'telefoon';

begin;

-- ---------------------------------------------------------------------------
-- 2. integraties
-- ---------------------------------------------------------------------------

create table montagebaas.integraties (
  id                       bigserial primary key,
  provider                 text not null check (provider in ('gmail')),
  account                  text not null,
  encrypted_refresh_token  text not null,          -- AES-256-GCM, sleutel in env INTEGRATIES_SLEUTEL
  scopes                   text[] not null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (provider, account)
);

revoke all on montagebaas.integraties from anon, authenticated;
grant select, insert, update, delete on montagebaas.integraties to service_role;
grant usage on sequence montagebaas.integraties_id_seq to service_role;
alter table montagebaas.integraties enable row level security;

-- ---------------------------------------------------------------------------
-- 3. offerte_drafts
-- ---------------------------------------------------------------------------

create table montagebaas.offerte_drafts (
  id                  bigserial primary key,
  aanvraag_id         uuid references montagebaas.aanvragen (id) on delete cascade,
  planner_uuid        text,                        -- null bij de PDF-terugval
  gmail_draft_id      text not null,
  gmail_thread_id     text not null,
  variant             text not null check (variant in ('uitgebreid', 'compact')),
  compleet_prijs      numeric(10, 2) not null,     -- incl. btw en toeslagen
  montageklaar_prijs  numeric(10, 2) not null,
  tarieven_id         uuid references montagebaas.tarieven (id),
  created_at          timestamptz not null default now()
);

create index offerte_drafts_aanvraag_idx on montagebaas.offerte_drafts (aanvraag_id);
create index offerte_drafts_planner_idx  on montagebaas.offerte_drafts (planner_uuid);

revoke all on montagebaas.offerte_drafts from anon, authenticated;
grant select, insert on montagebaas.offerte_drafts to service_role;
-- Koppelen bij "Opslaan als aanvraag": alleen aanvraag_id mag later gezet worden.
grant update (aanvraag_id) on montagebaas.offerte_drafts to service_role;
grant usage on sequence montagebaas.offerte_drafts_id_seq to service_role;
alter table montagebaas.offerte_drafts enable row level security;

-- ---------------------------------------------------------------------------
-- 4. ads_conversies_te_versturen (zie 0018)
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
  -- Niet voor aanvragen die Ilja zelf in /admin/offerte aanmaakte (0020).
  select a.id, 'aanvraag_ontvangen', a.created_at, null
  from montagebaas.aanvragen a
  where a.bron = 'website'
    and a.created_at >= now() - interval '90 days'
    and a.invoermethode::text is distinct from 'admin_link'
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
  a.naam,
  a.invoermethode
from kandidaten k
join montagebaas.aanvragen a on a.id = k.aanvraag_id
left join duplicaat dup on dup.aanvraag_id = k.aanvraag_id
left join montagebaas.ads_conversie_uploads u
       on u.aanvraag_id = k.aanvraag_id and u.conversie_actie = k.conversie_actie
where coalesce(k.log_tijdstip, k.fallback_tijdstip) is not null
  and (u.status is null or u.status not in ('verstuurd', 'overgeslagen'))
order by coalesce(k.log_tijdstip, k.fallback_tijdstip);

commit;
