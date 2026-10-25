// Merkconfig: MERK kiest het merk, en De Keukenheld noemt nergens de oude naam.
// Draaien: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MERKEN, merkVoorId, siteUrl } from "./index.ts";

test("merkVoorId: leeg, onbekend en hoofdletters", () => {
  assert.equal(merkVoorId(undefined).id, "montagebaas");
  assert.equal(merkVoorId("").id, "montagebaas");
  assert.equal(merkVoorId("iets-anders").id, "montagebaas");
  assert.equal(merkVoorId("constructor").id, "montagebaas");
  assert.equal(merkVoorId(" Keukenheld ").id, "keukenheld");
  assert.equal(merkVoorId("montagebaas").id, "montagebaas");
});

test("keukenheld: geen Montagebaas in de config, ook niet in links", () => {
  assert.doesNotMatch(JSON.stringify(MERKEN.keukenheld), /montagebaas/i);
});

test("keukenheld: domein, mail en afzender horen bij dekeukenheld.nl", () => {
  const k = MERKEN.keukenheld;
  assert.equal(k.url, `https://${k.domein}`);
  assert.match(k.email, /@dekeukenheld\.nl$/);
  assert.match(k.afzender, /^De Keukenheld <[^>]+@dekeukenheld\.nl>$/);
  assert.equal(k.kvk, MERKEN.montagebaas.kvk);
});

test("siteUrl: het merkdomein, NEXT_PUBLIC_SITE_URL alleen als override", () => {
  const oud = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(siteUrl(MERKEN.keukenheld), "https://dekeukenheld.nl");
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000/";
    assert.equal(siteUrl(MERKEN.keukenheld), "http://localhost:3000");
  } finally {
    if (oud === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = oud;
  }
});
