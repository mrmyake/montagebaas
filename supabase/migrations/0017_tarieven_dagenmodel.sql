-- 0017_tarieven_dagenmodel.sql
-- Nieuwe tarievenset: het dagenmodel uit spikes/dagenmodel (gefit op 15 offertes,
-- 2026-10). Schakel 2 (berekenPrijsUitTelling) rekent hiermee zodra
-- basis.vaste_minuten aanwezig is:
--   echte dagen = (725 + 50×onderkast + 37,5×bovenkast + 62,5×hoge kast + 15×lade) / 420
--   Compleet    = +½ dag, naar boven op een halve dag, max. tot de volgende hele dag, min. 2,5
--   Montageklaar = Compleet − 1 dag
--   prijs       = (dagen × 560 + 45) × 1,21, naar boven op een bedrag eindigend op 25/75/95
-- Velden zonder minuten (apparaten, werkblad, eiland, binneninrichting, …) wegen 0.
-- Losse posten (toeslagen, incl. btw): sloop oude keuken €995 (incl. container),
-- laminaat op locatie zagen €350. Hout blijft maatwerk (€400–525, handmatig).
-- inbegrepen: wat in de pakketprijs zit zonder eigen minuten (voor de site-teksten).
-- indicatiebanden: Compleet-band per keukengrootte (onder- + bovenkasten) voor de
-- vragenroute zonder telling, afgeleid door het model op de 36 gelezen ontwerpen
-- uit de spike te draaien (zie de PR-beschrijving). Klein begint op het minimum
-- (2,5 dag) in plaats van de modeluitkomst (3 dagen): liever laag dan hoog.
-- Grenzen zonder overlap: klein <8, gemiddeld 8–14, groot 15+. Afmonteren en losse klussen
-- hebben geen band: die vervallen in de nieuwe intake.
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
    },
    "toeslagen": {
      "sloop_incl": 995,
      "werkblad_zagen_incl": 350
    },
    "inbegrepen": ["apparaten", "spoelbak_kraan"],
    "indicatiebanden": {
      "klein":     { "kasten": "<8",   "laag": 1775, "hoog": 2475, "laag_dagen": 2.5, "hoog_dagen": 3.5 },
      "gemiddeld": { "kasten": "8-14", "laag": 2095, "hoog": 2775, "laag_dagen": 3, "hoog_dagen": 4 },
      "groot":     { "kasten": "15+",  "laag": 2775, "hoog": 3475, "laag_dagen": 4, "hoog_dagen": 5 }
    }
  }'::jsonb
);

commit;
