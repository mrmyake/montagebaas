-- 0006_lead_admin_fix.sql
-- Herstelt het opslaan in /admin/leads en /admin/roi.
--
-- 0005 gaf service_role wel insert op lead_status_log en advertentiekosten, maar
-- niet op de bijbehorende bigserial-sequences. Elke statuswijziging via de admin
-- faalde daardoor in de trigger log_lead_status() met
-- "permission denied for sequence lead_status_log_id_seq" (en daarmee rolde de
-- hele update op aanvragen terug); het ROI-formulier faalde op dezelfde manier.

grant usage on sequence montagebaas.lead_status_log_id_seq   to service_role;
grant usage on sequence montagebaas.advertentiekosten_id_seq to service_role;

-- notitie bestond al op aanvragen maar zat niet in de view, dus de admin kon de
-- huidige waarde niet tonen. Toegevoegd aan het eind (create or replace view
-- staat alleen nieuwe kolommen achteraan toe).
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
  a.notitie
from montagebaas.aanvragen a;
