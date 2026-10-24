import { test } from "node:test";
import assert from "node:assert/strict";
import { herinneringTekst, parseWerkelijkeDagen } from "./werkelijke-dagen.ts";

test("parseWerkelijkeDagen: leeg is null, komma en punt, halve dagen", () => {
  assert.deepEqual(parseWerkelijkeDagen(""), { ok: true, waarde: null });
  assert.deepEqual(parseWerkelijkeDagen(null), { ok: true, waarde: null });
  assert.deepEqual(parseWerkelijkeDagen(" 3,5 "), { ok: true, waarde: 3.5 });
  assert.deepEqual(parseWerkelijkeDagen("4"), { ok: true, waarde: 4 });
  assert.deepEqual(parseWerkelijkeDagen("0.5"), { ok: true, waarde: 0.5 });
});

test("parseWerkelijkeDagen: geen halve dag, 0, negatief, te groot of geen getal → fout", () => {
  for (const raw of ["3,25", "0", "-1", "31", "abc"]) {
    const r = parseWerkelijkeDagen(raw);
    assert.equal(r.ok, false, raw);
  }
});

test("herinneringTekst: oudste klus eerst, bedrag (gefactureerd vóór offerte), link naar het filter", () => {
  const { subject, text } = herinneringTekst(
    [
      { naam: "B", uitgevoerd_sinds: "2026-10-20T10:00:00Z", offerte_bedrag: 2775, gefactureerd_bedrag: null },
      { naam: "A", uitgevoerd_sinds: "2026-10-01T10:00:00Z", offerte_bedrag: 2475, gefactureerd_bedrag: 2600 },
    ],
    "https://montagebaas.com"
  );
  assert.equal(subject, "Werkelijke dagen invullen: 2 klussen");
  assert.ok(text.indexOf("- A,") < text.indexOf("- B,"));
  assert.match(text, /- A, uitgevoerd 1 okt 2026, € 2\.600/);
  assert.match(text, /- B, uitgevoerd 20 okt 2026, € 2\.775/);
  assert.match(text, /https:\/\/montagebaas\.com\/admin\/leads\?status=uitgevoerd/);
  assert.equal(herinneringTekst([{ naam: "C", uitgevoerd_sinds: "2026-10-01T10:00:00Z", offerte_bedrag: null, gefactureerd_bedrag: null }], "x").subject,
    "Werkelijke dagen invullen: 1 klus");
});
