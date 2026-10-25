// Bedragen in mails: één bedrag als laag en hoog gelijk zijn. Draaien: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bedrag } from "./pricing.ts";

const nbsp = (s: string) => s.replace(/ /g, " ");

test("bedrag: gelijk geeft één bedrag", () => {
  assert.equal(nbsp(bedrag(2975, 2975)), "€ 2.975");
});

test("bedrag: verschillend geeft een band", () => {
  assert.equal(nbsp(bedrag(2475, 3175)), "€ 2.475 – € 3.175");
});
