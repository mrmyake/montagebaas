-- 0016_werkelijke_dagen.sql
-- Werkelijk gewerkte dagen per klus, de grondwaarheid voor het dagenmodel
-- (schakel 2). De offerte is een inschatting vooraf; dit is wat de klus kostte.
--
-- In halve dagen, net als het dagenmodel. Bewust GEEN koppeling aan de
-- lead_status: een gemeten waarde blijft staan, ook als de status later
-- wijzigt. Het invulveld in /admin/leads is alleen actief bij gewonnen/uitgevoerd.

begin;

alter table montagebaas.aanvragen
  add column werkelijke_dagen numeric(3,1)
    constraint aanvragen_werkelijke_dagen_halve_dagen check (
      werkelijke_dagen is null
      or (werkelijke_dagen > 0 and werkelijke_dagen <= 30 and werkelijke_dagen * 2 = trunc(werkelijke_dagen * 2))
    );

-- lead_overzicht: werkelijke_dagen achteraan (create or replace view staat
-- alleen nieuwe kolommen aan het eind toe, zie 0006).
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
  a.planner_status,
  a.werkelijke_dagen
from montagebaas.aanvragen a;

commit;
