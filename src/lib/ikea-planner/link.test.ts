// URL-parsing van IKEA planner-links. Draaien: `npm test`.
// Varianten zijn dezelfde VORMEN als in spikes/ikea-planner/links.txt, maar met
// Ilja's eigen ontwerp en verzonnen UUID's: geen klant-UUID's in git.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlannerLink } from "./link.ts";

const ILJA = "36FDA15A-7C94-436F-ABEA-0C4BEB046ED6";
const NEP = "0A1B2C3D-4E5F-4A6B-8C7D-9E0F1A2B3C4D";

const geldig: [string, string, string][] = [
  // [invoer, verwachte uuid, verwachte genormaliseerde url]
  [`https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA}/?ref=share`, ILJA, `https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA}/`],
  [`https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA}/`, ILJA, `https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA}/`],
  [`https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA}`, ILJA, `https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA}/`],
  [`https://kitchen.planner.ikea.com/nl/nl/remote/${NEP}/view/`, NEP, `https://kitchen.planner.ikea.com/nl/nl/remote/${NEP}/view/`],
  [`https://kitchen.planner.ikea.com/nl/nl/remote/${NEP}/view`, NEP, `https://kitchen.planner.ikea.com/nl/nl/remote/${NEP}/view/`],
  // kleine letters in de UUID → hoofdletters
  [`https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA.toLowerCase()}/?ref=share`, ILJA, `https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA}/`],
  // andere taal/landcode
  [`https://kitchen.planner.ikea.com/be/fr/planner/${NEP}/?ref=share`, NEP, `https://kitchen.planner.ikea.com/be/fr/planner/${NEP}/`],
  [`https://kitchen.planner.ikea.com/de/de/remote/${NEP}/view/`, NEP, `https://kitchen.planner.ikea.com/de/de/remote/${NEP}/view/`],
  [`https://kitchen.planner.ikea.com/NL/NL/planner/${NEP}/`, NEP, `https://kitchen.planner.ikea.com/nl/nl/planner/${NEP}/`],
  // zonder protocol / http
  [`kitchen.planner.ikea.com/nl/nl/planner/${NEP}/`, NEP, `https://kitchen.planner.ikea.com/nl/nl/planner/${NEP}/`],
  [`http://kitchen.planner.ikea.com/nl/nl/planner/${NEP}/?ref=share&x=1`, NEP, `https://kitchen.planner.ikea.com/nl/nl/planner/${NEP}/`],
  // geplakt uit WhatsApp/mail: tekst, witruimte, regelafbrekingen, <…> eromheen
  [`  https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA}/?ref=share  `, ILJA, `https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA}/`],
  [`Bekijk mijn IKEA-keuken: https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA}/?ref=share`, ILJA, `https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA}/`],
  [`Hoi!\n\nhttps://kitchen.planner.ikea.com/nl/nl/remote/${NEP}/view/\nGroet, K.`, NEP, `https://kitchen.planner.ikea.com/nl/nl/remote/${NEP}/view/`],
  [`<https://kitchen.planner.ikea.com/nl/nl/planner/${NEP}/?ref=share>`, NEP, `https://kitchen.planner.ikea.com/nl/nl/planner/${NEP}/`],
  [`(https://kitchen.planner.ikea.com/nl/nl/planner/${NEP}/)`, NEP, `https://kitchen.planner.ikea.com/nl/nl/planner/${NEP}/`],
];

for (const [invoer, uuid, url] of geldig) {
  test(`herkent: ${JSON.stringify(invoer).slice(0, 90)}`, () => {
    const r = parsePlannerLink(invoer);
    assert.deepEqual(r, { ok: true, uuid, url });
  });
}

const ongeldig = [
  "",
  "   ",
  "https://kitchen.planner.ikea.com/nl/nl/planner/ABCDEF12-XXXX/",
  `https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA.slice(0, 30)}/`,
  "https://www.ikea.com/nl/nl/planner/kitchen-planner/",
  `https://example.com/nl/nl/planner/${ILJA}/`,
  `https://kitchen.planner.ikea.com/nl/nl/other/${ILJA}/`,
  `https://kitchen.planner.ikea.com/nl/nl/?project=${ILJA}`,
  ILJA, // losse UUID zonder link: klant moet de link plakken
  "mijn keuken is wit met eiken blad",
];

for (const invoer of ongeldig) {
  test(`weigert: ${JSON.stringify(invoer).slice(0, 90)}`, () => {
    assert.deepEqual(parsePlannerLink(invoer), { ok: false });
  });
}

test("null/undefined → ongeldig", () => {
  assert.deepEqual(parsePlannerLink(null), { ok: false });
  assert.deepEqual(parsePlannerLink(undefined), { ok: false });
});

test("UUID gevolgd door extra hex wordt niet half herkend", () => {
  assert.deepEqual(parsePlannerLink(`https://kitchen.planner.ikea.com/nl/nl/planner/${ILJA}AB/`), { ok: false });
});
