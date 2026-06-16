-- Montagebaas — initiële database
-- Draait in het GEDEELDE Supabase-project, geïsoleerd in een eigen schema `montagebaas`.
-- Voer uit in de Supabase SQL Editor (of via psql met de DATABASE_URL).
--
-- ⚠️ NA HET DRAAIEN: voeg `montagebaas` toe aan Settings → API → "Exposed schemas"
--    in het Supabase-dashboard, anders weigert PostgREST alle queries op dit schema.

-- =========================================================
-- Schema + rechten
-- =========================================================
create schema if not exists montagebaas;

-- PostgREST-rollen toegang geven tot het schema
grant usage on schema montagebaas to anon, authenticated, service_role;

-- =========================================================
-- Tabel: aanvragen (de leads — dit is het product)
-- =========================================================
create table if not exists montagebaas.aanvragen (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  type_klus            text not null,            -- bv. "complete_ikea_keuken"
  aantal_kasten_range  text not null,            -- "<8" / "8-15" / "15+"
  opstelling           text not null,            -- recht / hoek / eiland
  extras               jsonb not null default '[]'::jsonb,  -- gekozen extra's
  prijs_indicatie_min  integer not null,
  prijs_indicatie_max  integer not null,
  postcode             text not null,            -- alleen postcode, geen volledig adres
  regio                text,                     -- afgeleid uit postcode
  naam                 text not null,
  telefoon             text not null,
  email                text not null,
  gewenste_periode     text not null,
  toelichting          text,
  status               text not null default 'nieuw'  -- voor opvolging
);

create index if not exists aanvragen_created_at_idx on montagebaas.aanvragen (created_at desc);
create index if not exists aanvragen_status_idx on montagebaas.aanvragen (status);

-- De service-role mag schrijven/lezen (omzeilt RLS). anon/authenticated krijgen GEEN grants.
grant select, insert, update, delete on montagebaas.aanvragen to service_role;

-- RLS aan: zonder policies kan anon/authenticated niets. Leads schrijf je server-side
-- met de service-role key; uitlezen via dashboard of een geauthenticeerde admin.
alter table montagebaas.aanvragen enable row level security;

-- =========================================================
-- Tabel: steden (programmatic local SEO)
-- =========================================================
create table if not exists montagebaas.steden (
  slug         text primary key,                 -- bv. "amsterdam"
  naam         text not null,                     -- bv. "Amsterdam"
  provincie    text not null,
  intro_tekst  text not null,                     -- UNIEK per stad
  wijken       jsonb not null default '[]'::jsonb,-- lokale ankers
  inwoners     integer
);

-- steden is publieke content → anon/authenticated mogen lezen.
grant select on montagebaas.steden to anon, authenticated;
grant select, insert, update, delete on montagebaas.steden to service_role;

alter table montagebaas.steden enable row level security;

drop policy if exists "steden_public_read" on montagebaas.steden;
create policy "steden_public_read"
  on montagebaas.steden
  for select
  to anon, authenticated
  using (true);
