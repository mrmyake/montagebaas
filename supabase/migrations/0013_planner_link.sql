-- 0013_planner_link.sql
-- IKEA planner-link als derde ingang op /offerte (naast formulier en upload).
--
-- 1. aanvragen.invoermethode: welke route de klant nam (formulier/link/pdf/foto),
--    zodat lead_overzicht laat zien welke route het meest gebruikt wordt en het
--    best converteert.
-- 2. aanvragen.planner_status: uitkomst van het uitlezen van de link (ok of een
--    foutcategorie), zichtbaar zonder join.
-- 3. planner_snapshots: per ophaalpoging de volledige opgeslagen BOM + versie-
--    gegevens, zodat een offerte later aantoonbaar terug te voeren is op precies
--    het ontwerp dat we gelezen hebben, ook als de klant het daarna aanpast.
--    Onveranderlijk: alleen insert, nooit update (zelfde principe als tarieven).
-- 4. ikea_artikelen: cache van productgegevens per IKEA-id (ART-/EXT-), ververst
--    als ouder dan 30 dagen. Scheelt calls naar IKEA: METOD-kasten komen steeds terug.

-- ---------------------------------------------------------------------------
-- 1 + 2. aanvragen
-- ---------------------------------------------------------------------------

create type montagebaas.invoermethode as enum ('formulier', 'link', 'pdf', 'foto');

alter table montagebaas.aanvragen
  add column invoermethode  montagebaas.invoermethode,
  add column planner_status text check (planner_status in (
    'ok', 'ongeldige_link', 'niet_gevonden', 'ikea_fout', 'timeout', 'onverwachte_structuur'
  ));

-- Backfill: uploads met minstens één PDF → pdf, overige uploads → foto, de rest
-- kwam via het formulier.
update montagebaas.aanvragen
   set invoermethode = case
     when not tekening_geupload then 'formulier'
     when tekening_pad ilike '%.pdf%' then 'pdf'
     else 'foto'
   end::montagebaas.invoermethode
 where invoermethode is null;

create index aanvragen_invoermethode_idx on montagebaas.aanvragen (invoermethode);

-- ---------------------------------------------------------------------------
-- 3. planner_snapshots
-- ---------------------------------------------------------------------------

create table montagebaas.planner_snapshots (
  id                bigserial primary key,
  aanvraag_id       uuid not null references montagebaas.aanvragen (id) on delete cascade,
  planner_url       text not null,              -- zoals de klant hem invulde
  ontwerp_uuid      text not null,              -- genormaliseerd, hoofdletters
  status            text not null check (status in (
    'ok', 'ongeldige_link', 'niet_gevonden', 'ikea_fout', 'timeout', 'onverwachte_structuur'
  )),
  fout_detail       text,                       -- technische reden, alleen intern
  opgehaald_op      timestamptz not null default now(),
  duur_ms           integer,
  -- Versie van het ontwerp (alleen bij status ok)
  project_naam      text,
  datum_aangemaakt  timestamptz,                -- project.dateCreation
  datum_opgeslagen  timestamptz,                -- project.dateUpdate (laatst opgeslagen)
  versie_tag        text,                       -- ETag van metadata/2
  bom_sha256        text,                       -- sha256 over bom_ruw
  vergrendeld       boolean,                    -- project.is_locked
  bom_ruw           text,                       -- appData.bom exact zoals opgehaald
  project           jsonb,                      -- /3/projects/<uuid>
  -- Uitkomst van schakel 1 + 2 op deze snapshot
  telling           jsonb,
  tarieven_id       uuid references montagebaas.tarieven (id)
);

create index planner_snapshots_aanvraag_idx on montagebaas.planner_snapshots (aanvraag_id, opgehaald_op desc);
create index planner_snapshots_uuid_idx     on montagebaas.planner_snapshots (ontwerp_uuid);

grant select, insert on montagebaas.planner_snapshots to service_role;
grant usage on sequence montagebaas.planner_snapshots_id_seq to service_role;
alter table montagebaas.planner_snapshots enable row level security;

-- ---------------------------------------------------------------------------
-- 4. ikea_artikelen
-- ---------------------------------------------------------------------------

create table montagebaas.ikea_artikelen (
  db_id          text primary key,              -- 'ART-40591703-NL' of 'EXT-42465223-NL'
  artikelnummer  text,                          -- '405.917.03' (null bij EXT)
  referentie     text,                          -- definition.reference + '-NL'
  naam           text not null default '',      -- 'METOD'
  omschrijving   text not null default '',      -- 'onderkast, zwartgrijs'
  maat           text,                          -- '60x60x80 cm'
  breedte        numeric,
  diepte         numeric,
  hoogte         numeric,
  leverbaar      boolean,                       -- availability = 1 en endDate in de toekomst
  eind_datum     timestamptz,                   -- definition.endDate
  ruw            jsonb,                         -- ingekorte productdefinitie
  bijgewerkt_op  timestamptz not null default now()
);

grant select, insert, update on montagebaas.ikea_artikelen to service_role;
alter table montagebaas.ikea_artikelen enable row level security;

-- ---------------------------------------------------------------------------
-- 5. lead_overzicht: invoermethode + planner_status achteraan
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
  a.planner_status
from montagebaas.aanvragen a;
