-- Montagebaas — tekening-upload als tweede ingang op /offerte
-- Draait in schema `montagebaas`. Idempotent.
--
-- Voegt twee kolommen toe aan aanvragen en maakt de keuken-/prijs-velden nullable,
-- zodat het upload-pad (alleen bestand + contact) ook in dezelfde tabel past.
-- Maakt daarnaast een PRIVÉ storage-bucket voor de geüploade tekeningen.

-- =========================================================
-- aanvragen: extra kolommen
-- =========================================================
alter table montagebaas.aanvragen
  add column if not exists tekening_geupload boolean not null default false,
  add column if not exists tekening_pad text;

-- Upload-pad heeft geen keuken-configuratie/prijs/postcode → die kolommen nullable.
-- (Het formulier-pad blijft deze server-side valideren, dus dat verandert niet.)
alter table montagebaas.aanvragen alter column type_klus           drop not null;
alter table montagebaas.aanvragen alter column aantal_kasten_range drop not null;
alter table montagebaas.aanvragen alter column opstelling          drop not null;
alter table montagebaas.aanvragen alter column gewenste_periode    drop not null;
alter table montagebaas.aanvragen alter column prijs_indicatie_min drop not null;
alter table montagebaas.aanvragen alter column prijs_indicatie_max drop not null;
alter table montagebaas.aanvragen alter column postcode            drop not null;

-- naam / telefoon / email blijven NOT NULL — beide paden verzamelen contact.

-- =========================================================
-- Storage: privé bucket voor geüploade tekeningen
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offerte-tekeningen',
  'offerte-tekeningen',
  false,
  8388608, -- 8 MB
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;
