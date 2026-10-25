/**
 * RELEASE-BLOCKER — tijdelijke bedragen uit de redesign-spec.
 *
 * Deze bedragen hebben nog geen bron in `montagebaas.tarieven` of Schakel 2. De
 * dagenmodel-PR zet ze in tarieven; na die merge vervangt prijs-weergave.ts dit
 * bestand door de tarievenrij en verdwijnt dit bestand. Tot dan:
 *  - alleen prijs-weergave.ts importeert dit bestand, nooit een component;
 *  - niet naar productie zonder akkoord van Ilja.
 *
 * Bron: docs/design/PrijsEerstLink.dc.html + beslissing Ilja (25-10-2026).
 * Alle bedragen incl. btw en reiskosten.
 */

export const PRIJS_TIJDELIJK = {
  // Vragenroute (en PDF-route zonder lezing): band voor complete montage per
  // keukengrootte, ongeacht opstelling.
  banden: {
    "<8": { laag: 1775, hoog: 2095 },
    "8-15": { laag: 2475, hoog: 2775 },
    "15+": { laag: 3125, hoog: 3475 },
  },
  afmonteren: { laag: 775, hoog: 1425 },
  losseKlusVanaf: 350,
  // "Zet je de kasten zelf in elkaar? Met Montageklaar betaal je ongeveer € 700 minder."
  montageklaarScheeltOngeveer: 700,
  extras: {
    demontage: 995, // oude keuken eruit, incl. container
    werkblad_zagen: 350, // laminaat op standaardlengte, op locatie zagen
    apparaten: 0, // inbegrepen
    spoelbak: 0, // inbegrepen
    // Lichte leidingaanpassing: geen bedrag. Ilja prijst aan- en afvoer alleen na een opname ter plekke.
  },
} as const;
