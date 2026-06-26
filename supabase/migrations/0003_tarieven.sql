-- Montagebaas — tarieven als versioneerbare bron (schema-contract v2, schakel 2)
-- Draait in schema `montagebaas` (NIET public — dat schema delen de zustersites).
-- Idempotent waar mogelijk; de seed-insert draait alleen als de tabel nog leeg is.

-- =========================================================
-- Tabel: tarieven (versioneerbaar; onveranderlijk — wijziging = nieuwe rij)
-- =========================================================
create table if not exists montagebaas.tarieven (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,                 -- "Standaard 2026-06", "Actie zomer"
  regio         text,                          -- null = landelijk (fase 1)
  geldig_vanaf  timestamptz not null default now(),
  actief        boolean not null default true,
  waarden       jsonb not null,                -- { basis: {...}, minuten: {...} }
  created_at    timestamptz not null default now()
);

create index if not exists tarieven_selectie_idx
  on montagebaas.tarieven (actief, regio, geldig_vanaf desc);

-- Alleen server-side (service-role) leest/schrijft tarieven.
grant select, insert, update, delete on montagebaas.tarieven to service_role;
alter table montagebaas.tarieven enable row level security;

-- =========================================================
-- aanvragen verwijst naar de gebruikte tarieven-versie (reconstrueerbaarheid)
-- =========================================================
alter table montagebaas.aanvragen
  add column if not exists tarieven_id uuid references montagebaas.tarieven(id);

-- =========================================================
-- Seed (fase 1): één landelijke set uit de spreadsheet. Alleen als nog leeg.
-- =========================================================
insert into montagebaas.tarieven (label, regio, actief, waarden)
select
  'Standaard 2026-06',
  null,
  true,
  '{
    "basis": { "dagtarief_excl": 560, "effectieve_uren_dag": 7, "voorrij_excl": 45, "btw": 0.21 },
    "minuten": {
      "onderkasten":          { "tijd": 40, "asm": 22 },
      "bovenkasten":          { "tijd": 30, "asm": 16 },
      "hoge_kasten":          { "tijd": 50, "asm": 28 },
      "lade_elementen":       { "tijd": 15, "asm": 12 },
      "zijwanden":            { "tijd": 25, "asm": 0 },
      "plint_meter":          { "tijd": 10, "asm": 0 },
      "lichtlijst_meter":     { "tijd": 12, "asm": 0 },
      "werkblad_meter":       { "tijd": 20, "asm": 0 },
      "uitsparing_spoelbak":  { "tijd": 60, "asm": 0 },
      "uitsparing_kookplaat": { "tijd": 60, "asm": 0 },
      "koppeling":            { "tijd": 30, "asm": 0 },
      "spatwand_meter":       { "tijd": 15, "asm": 0 },
      "spoelbak_kraan":       { "tijd": 90, "asm": 0 },
      "vaatwasser":           { "tijd": 60, "asm": 0 },
      "inductie":             { "tijd": 30, "asm": 0 },
      "gaskookplaat":         { "tijd": 50, "asm": 0 },
      "afzuigkap":            { "tijd": 60, "asm": 0 },
      "oven":                 { "tijd": 30, "asm": 0 },
      "koelkast_vriezer":     { "tijd": 35, "asm": 0 },
      "magnetron":            { "tijd": 25, "asm": 0 },
      "sloop":                { "tijd": 120, "asm": 0 },
      "scheve_muren":         { "tijd": 45, "asm": 0 },
      "kraanboring":          { "tijd": 30, "asm": 0 },
      "afvoer_leidingwerk":   { "tijd": 30, "asm": 0 },
      "onderkast_verlichting":{ "tijd": 25, "asm": 0 }
    }
  }'::jsonb
where not exists (select 1 from montagebaas.tarieven);
