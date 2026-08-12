-- 0005_lead_status.sql
-- Leadstatus, uitkomst en ROI-rapportage voor Montagebaas.
-- Bouwt voort op 0004_attributie.sql (gclid, gbraid, wbraid, utm_*, landing_page, referrer).
--
-- Let op: de kolom `status` op aanvragen bestaat al sinds 0001_init.sql en
-- volgt het tekening-upload-verwerkingspad (tekening_verwerken/prijs_berekend/
-- prijs_indicatie/controle_tekening — zie src/lib/tekening-verwerker.ts en
-- src/app/api/offerte-status/route.ts). Dit is een ANDER concept dan de
-- sales-pipeline hieronder, dus die krijgt een eigen kolom: lead_status.

-- ---------------------------------------------------------------------------
-- 1. Lead-status
-- ---------------------------------------------------------------------------

create type montagebaas.lead_status as enum (
  'nieuw',              -- binnengekomen, nog niets mee gedaan
  'contact_gelegd',     -- eerste bericht de deur uit
  'offerte_verstuurd',  -- vaste prijs gecommuniceerd
  'wacht_op_klant',     -- bal ligt bij de klant
  'gewonnen',           -- akkoord, staat in de agenda
  'uitgevoerd',         -- klus af en gefactureerd
  'verloren',           -- klant koos iets anders
  'geen_reactie',       -- doodgebloed
  'niet_passend'        -- buiten straal, geen IKEA, verkeerde klus
);

create type montagebaas.lead_bron as enum (
  'website',            -- montagebaas.com of dekeukenheld.nl
  'werkspot',
  'doorverwijzing',
  'overig'
);

alter table montagebaas.aanvragen
  add column lead_status              montagebaas.lead_status not null default 'nieuw',
  add column lead_status_gewijzigd_op timestamptz             not null default now(),
  add column bron                     montagebaas.lead_bron   not null default 'website',
  add column offerte_bedrag           numeric(10,2),  -- incl. BTW, wat je hebt geoffreerd
  add column gefactureerd_bedrag      numeric(10,2),  -- incl. BTW, wat er daadwerkelijk uit kwam
  add column reden_verloren           text,
  add column notitie                  text;

-- Alleen lead-statussen die geld opleveren mogen een gefactureerd bedrag hebben.
alter table montagebaas.aanvragen
  add constraint aanvragen_bedrag_past_bij_status check (
    gefactureerd_bedrag is null
    or lead_status in ('gewonnen', 'uitgevoerd')
  );

create index aanvragen_lead_status_idx on montagebaas.aanvragen (lead_status);
create index aanvragen_bron_idx        on montagebaas.aanvragen (bron);

-- ---------------------------------------------------------------------------
-- 2. Statusgeschiedenis
-- ---------------------------------------------------------------------------
-- Onveranderlijke log, zelfde principe als de tarieventabel. Hiermee kun je
-- later doorlooptijden meten: hoe lang van nieuw naar offerte, van offerte
-- naar gewonnen.

create table montagebaas.lead_status_log (
  id             bigserial primary key,
  aanvraag_id    uuid not null references montagebaas.aanvragen (id) on delete cascade,
  van_status     montagebaas.lead_status,
  naar_status    montagebaas.lead_status not null,
  gewijzigd_op   timestamptz not null default now(),
  notitie        text
);

create index lead_status_log_aanvraag_idx on montagebaas.lead_status_log (aanvraag_id, gewijzigd_op);

-- Alleen service-role (de trigger draait onder de rol die de update uitvoert).
grant select, insert on montagebaas.lead_status_log to service_role;
alter table montagebaas.lead_status_log enable row level security;

create or replace function montagebaas.log_lead_status()
returns trigger
language plpgsql
as $$
begin
  if new.lead_status is distinct from old.lead_status then
    new.lead_status_gewijzigd_op := now();
    insert into montagebaas.lead_status_log (aanvraag_id, van_status, naar_status)
    values (new.id, old.lead_status, new.lead_status);
  end if;
  return new;
end;
$$;

create trigger aanvragen_lead_status_log
  before update on montagebaas.aanvragen
  for each row
  execute function montagebaas.log_lead_status();

-- ---------------------------------------------------------------------------
-- 3. Advertentiekosten
-- ---------------------------------------------------------------------------
-- Zonder kostenkant is er geen ROI. Per maand per campagne, handmatig of via
-- de Ads API. Werkspot-leadkosten kun je hier ook kwijt met kanaal 'werkspot'.

create table montagebaas.advertentiekosten (
  id           bigserial primary key,
  maand        date        not null,  -- altijd de eerste van de maand
  kanaal       text        not null,  -- 'google_ads', 'werkspot'
  campagne     text,                  -- naam of id, null voor werkspot
  kosten       numeric(10,2) not null, -- excl. BTW
  ingevoerd_op timestamptz not null default now(),
  unique (maand, kanaal, campagne)
);

grant select, insert, update, delete on montagebaas.advertentiekosten to service_role;
alter table montagebaas.advertentiekosten enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Rapportageviews
-- ---------------------------------------------------------------------------

-- Per lead: is er een betaalde klik aan gekoppeld, en welke campagne.
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
  now() - a.lead_status_gewijzigd_op       as stil_sinds
from montagebaas.aanvragen a;

-- ROI per leadmaand per kanaal.
-- Let op: gegroepeerd op de maand waarin de LEAD binnenkwam, niet waarin de
-- klus is uitgevoerd. Een aanvraag van juli kan pas in oktober omzet worden,
-- dus recente maanden zien er structureel slechter uit dan ze zijn.
create or replace view montagebaas.roi_per_maand as
with leads as (
  select
    date_trunc('month', a.created_at)::date as maand,
    case
      when a.bron = 'werkspot' then 'werkspot'
      when coalesce(a.gclid, a.gbraid, a.wbraid) is not null then 'google_ads'
      else 'organisch_of_onbekend'
    end as kanaal,
    count(*)                                                              as aanvragen,
    count(*) filter (where a.lead_status in ('gewonnen', 'uitgevoerd'))    as gewonnen,
    count(*) filter (where a.lead_status = 'verloren')                    as verloren,
    count(*) filter (where a.lead_status = 'geen_reactie')                as geen_reactie,
    coalesce(sum(a.gefactureerd_bedrag) filter (
      where a.lead_status in ('gewonnen', 'uitgevoerd')), 0)              as omzet
  from montagebaas.aanvragen a
  group by 1, 2
),
kosten as (
  select maand, kanaal, sum(kosten) as kosten
  from montagebaas.advertentiekosten
  group by 1, 2
)
select
  l.maand,
  l.kanaal,
  l.aanvragen,
  l.gewonnen,
  l.verloren,
  l.geen_reactie,
  round(100.0 * l.gewonnen / nullif(l.aanvragen, 0), 1) as conversie_pct,
  l.omzet,
  k.kosten,
  round(k.kosten / nullif(l.aanvragen, 0), 2)           as kosten_per_lead,
  round(k.kosten / nullif(l.gewonnen, 0), 2)            as kosten_per_klus,
  round(l.omzet / nullif(k.kosten, 0), 2)               as roas
from leads l
left join kosten k on k.maand = l.maand and k.kanaal = l.kanaal
order by l.maand desc, l.kanaal;

-- Uploadbestand voor Google Ads offline conversion import.
-- Eén regel per gewonnen lead met een klik-id. Exporteren als CSV.
create or replace view montagebaas.ads_offline_conversies as
select
  a.gclid,
  a.gbraid,
  a.wbraid,
  'Opdracht gewonnen'                                          as conversion_name,
  to_char(a.lead_status_gewijzigd_op at time zone 'Europe/Amsterdam',
          'YYYY-MM-DD HH24:MI:SS+02:00')                       as conversion_time,
  round(coalesce(a.gefactureerd_bedrag, a.offerte_bedrag) / 1.21, 2) as conversion_value,
  'EUR'                                                        as currency_code
from montagebaas.aanvragen a
where a.lead_status in ('gewonnen', 'uitgevoerd')
  and coalesce(a.gclid, a.gbraid, a.wbraid) is not null
  and coalesce(a.gefactureerd_bedrag, a.offerte_bedrag) is not null;

-- Views hebben zelf geen RLS; toegang loopt via de onderliggende tabellen.
-- Alleen service-role mag ze lezen (zelfde grant-patroon als de rest van dit schema).
grant select on montagebaas.lead_overzicht, montagebaas.roi_per_maand, montagebaas.ads_offline_conversies
  to service_role;
