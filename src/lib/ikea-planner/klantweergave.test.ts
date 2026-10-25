// Klantweergave na het lezen van een planner-link. Draaien: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { klantweergave, werkbladUitTelling } from "./klantweergave.ts";
import { TELVELDEN, type KeukenTelling } from "../rekenen.ts";

function telling(velden: Partial<KeukenTelling>): KeukenTelling {
  const t = Object.fromEntries(TELVELDEN.map((k) => [k, 0])) as unknown as KeukenTelling;
  return { ...t, aannames: [], vertrouwen: "hoog", ...velden };
}

test("chips en bon uit de telling", () => {
  const w = klantweergave({
    telling: telling({ onderkasten: 8, bovenkasten: 5, hoge_kasten: 1, vaatwasser: 1, inductie: 1, oven: 1, afzuigkap: 1, spoelbak_kraan: 1 }),
    artikelen: [{ dbId: "ART-1", artikelnummer: "1", naam: "Ekbacken", omschrijving: "maatwerkblad", soort: "maatwerkblad", aantal: 1, leverbaar: true }],
    werkblad: "maatwerk_laminaat",
  });
  assert.deepEqual(w.chips, ["14 kasten", "EKBACKEN-werkblad, voorgezaagd", "4 inbouwapparaten", "Spoelbak met kraan"]);
  assert.deepEqual(w.meldingen, []);
});

test("meldingen: eiland, eigen apparaten, niet herkend; geen interne bedragen", () => {
  const w = klantweergave({
    telling: telling({
      eiland: 1,
      aannames: [
        "Eiland met spoelbak en vaatwasser: water en afvoer moeten vóór de montage in de vloer liggen.",
        "Geen oven in de lijst: eigen apparaat of nog niet besteld? Merk en type nodig voor nismaten.",
        "Geen vaatwasser in de lijst: eigen apparaat of nog niet besteld? Merk en type nodig voor nismaten.",
        "Niet herkend, controleren: opberger (123.456.78)",
        "Laminaat werkblad op standaardlengte: op locatie zagen, toeslag halve dag (~€350) zit NIET in de berekende prijs",
      ],
    }),
    artikelen: [],
    werkblad: "laminaat_op_locatie",
  });
  assert.equal(w.meldingen.length, 3);
  assert.match(w.meldingen[0], /^Je kookeiland krijgt een spoelbak en vaatwasser\. Water en afvoer/);
  assert.match(w.meldingen[1], /^Geen oven en vaatwasser in je ontwerp/);
  assert.ok(!w.meldingen.join(" ").includes("€"));
  assert.ok(w.chips.includes("Met kookeiland"));
});

test("werkbladUitTelling herkent laminaat op standaardlengte", () => {
  assert.equal(werkbladUitTelling({ aannames: ["Laminaat werkblad op standaardlengte: op locatie zagen"] }), "laminaat_op_locatie");
  assert.equal(werkbladUitTelling({ aannames: [] }), null);
});
