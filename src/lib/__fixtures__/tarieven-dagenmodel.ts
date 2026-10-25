// Gelijk aan de tarievenrij 'Dagenmodel 2026-10' (0017_tarieven_dagenmodel.sql + b198969),
// live sinds 25-10-2026. Voor tests van de prijsadapter; de echte waarden komen uit de DB.
import type { Tarieven } from "../rekenen.ts";

export const TARIEVEN_DAGENMODEL: Tarieven = {
  basis: {
    dagtarief_excl: 560,
    effectieve_uren_dag: 7,
    voorrij_excl: 45,
    btw: 0.21,
    vaste_minuten: 725,
    buffer_dagen: 0.5,
    minimum_dagen: 2.5,
    montageklaar_min_dagen: 1,
    prijs_eindigt_op: [25, 75, 95],
  },
  minuten: {
    onderkasten: { tijd: 50, asm: 0 },
    bovenkasten: { tijd: 37.5, asm: 0 },
    hoge_kasten: { tijd: 62.5, asm: 0 },
    lade_elementen: { tijd: 15, asm: 0 },
  },
  toeslagen: { sloop_incl: 995, werkblad_zagen_incl: 350 },
  inbegrepen: ["apparaten", "spoelbak_kraan"],
  indicatiebanden: {
    klein: { kasten: "<8", laag: 1775, hoog: 2475, laag_dagen: 2.5, hoog_dagen: 3.5 },
    gemiddeld: { kasten: "8-14", laag: 2095, hoog: 2775, laag_dagen: 3, hoog_dagen: 4 },
    groot: { kasten: "15+", laag: 2775, hoog: 3475, laag_dagen: 4, hoog_dagen: 5 },
  },
};
