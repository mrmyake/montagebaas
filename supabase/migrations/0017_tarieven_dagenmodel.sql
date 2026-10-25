-- 0017_tarieven_dagenmodel.sql
-- Nieuwe tarievenset: het dagenmodel uit spikes/dagenmodel (gefit op 15 offertes,
-- 2026-10). Schakel 2 (berekenPrijsUitTelling) rekent hiermee zodra
-- basis.vaste_minuten aanwezig is:
--   echte dagen = (725 + 50×onderkast + 37,5×bovenkast + 62,5×hoge kast + 15×lade) / 420
--   Compleet    = +½ dag, naar boven op een halve dag, max. tot de volgende hele dag, min. 2,5
--   Montageklaar = Compleet − 1 dag
--   prijs       = (dagen × 560 + 45) × 1,21, naar boven op een bedrag eindigend op 25/75/95
-- Velden zonder minuten (apparaten, werkblad, eiland, binneninrichting, …) wegen 0;
-- toeslagen (laminaat op locatie zagen, hout) blijven los.
--
-- PAS TOEPASSEN NA DE DEPLOY van de code die basis.vaste_minuten kent: oude code
-- zou van deze rij alleen de kastminuten zien, zonder vaste basis.
-- laadTarieven kiest de actieve rij met de nieuwste geldig_vanaf; de oude rij
-- 'Standaard 2026-06' blijft ongewijzigd staan (tarieven zijn onveranderlijk).
-- Terugdraaien: update montagebaas.tarieven set actief = false where label = 'Dagenmodel 2026-10';

begin;

insert into montagebaas.tarieven (label, regio, actief, waarden)
values (
  'Dagenmodel 2026-10',
  null,
  true,
  '{
    "basis": {
      "dagtarief_excl": 560,
      "effectieve_uren_dag": 7,
      "voorrij_excl": 45,
      "btw": 0.21,
      "vaste_minuten": 725,
      "buffer_dagen": 0.5,
      "minimum_dagen": 2.5,
      "montageklaar_min_dagen": 1,
      "prijs_eindigt_op": [25, 75, 95]
    },
    "minuten": {
      "onderkasten":    { "tijd": 50,   "asm": 0 },
      "bovenkasten":    { "tijd": 37.5, "asm": 0 },
      "hoge_kasten":    { "tijd": 62.5, "asm": 0 },
      "lade_elementen": { "tijd": 15,   "asm": 0 }
    }
  }'::jsonb
);

commit;
