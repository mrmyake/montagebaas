-- 0015_ads_verwerking.sql
-- Verwerkingsstatus van de Data Manager API per upload-rij.
--
-- Een geslaagde events:ingest (HTTP 200 + requestId) betekent alleen dat Google
-- de request heeft aangenomen; de echte verwerking volgt later en is op te
-- vragen via GET v1/requestStatus:retrieve?requestId=… (zie
-- src/lib/ads-verwerking.ts). De cron slaat het antwoord hier op:
--   { status, record_count, error_info, warning_info, opgehaald_op }
-- status ∈ SUCCESS | PARTIAL_SUCCESS | FAILED (eindstatus) |
--          PROCESSING | REQUEST_STATUS_UNKNOWN (opnieuw controleren) |
--          null (ophalen mislukt; zie veld fout).
-- Eén requestId dekt alle rijen van één upload-request; alle rijen met dat
-- request_id krijgen dezelfde verwerking. Idempotent.

alter table montagebaas.ads_conversie_uploads
  add column if not exists verwerking jsonb;

comment on column montagebaas.ads_conversie_uploads.verwerking is
  'Laatst opgehaalde requestStatus van de Data Manager API: {status, record_count, error_info, warning_info, opgehaald_op}.';
