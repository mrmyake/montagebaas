import { test } from "node:test";
import assert from "node:assert/strict";
import { verwerkLezing } from "./tekening-lezing.ts";
import { STEENBLAD_AANNAME, TELVELDEN } from "./rekenen.ts";

const lezing = (extra: Record<string, unknown> = {}) => ({
  ...Object.fromEntries(TELVELDEN.filter((v) => v !== "binneninrichting" && v !== "eiland").map((v) => [v, 0])),
  onderkasten: 6, werkblad_meter: 3.6, koppeling: 1, uitsparing_spoelbak: 1, uitsparing_kookplaat: 1, spoelbak_kraan: 1,
  aannames: ["bron: itemlijst"], vertrouwen: "hoog",
  ...extra,
});

test("tekeninglezing met steenblad: zelfde regel als de planner-route", () => {
  const v = verwerkLezing(lezing({ werkblad_materiaal: "steen" }));
  assert.equal(v.ok, true);
  if (!v.ok) return;
  for (const veld of ["werkblad_meter", "koppeling", "uitsparing_spoelbak", "uitsparing_kookplaat", "spoelbak_kraan"] as const) {
    assert.equal(v.telling[veld], 0, veld);
  }
  assert.equal(v.telling.onderkasten, 6);
  assert.ok(v.telling.aannames.includes(STEENBLAD_AANNAME));
  assert.equal("werkblad_materiaal" in v.telling, false);
});

test("tekeninglezing met laminaat, onbekend of zonder materiaal: werkblad blijft staan; latere velden op 0", () => {
  for (const extra of [{ werkblad_materiaal: "laminaat" }, { werkblad_materiaal: "onbekend" }, {}]) {
    const v = verwerkLezing(lezing(extra));
    assert.equal(v.ok, true);
    if (!v.ok) return;
    assert.equal(v.telling.werkblad_meter, 3.6);
    assert.equal(v.telling.spoelbak_kraan, 1);
    assert.equal(v.telling.binneninrichting, 0);
    assert.equal(v.telling.eiland, 0);
    assert.ok(!v.telling.aannames.includes(STEENBLAD_AANNAME));
  }
});

test("ongeldige lezing blijft ongeldig, ook met steenblad", () => {
  const v = verwerkLezing(lezing({ werkblad_materiaal: "steen", onderkasten: undefined }));
  assert.equal(v.ok, false);
});
