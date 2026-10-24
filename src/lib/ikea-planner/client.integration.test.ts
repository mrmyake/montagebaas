// Integratietest tegen de ECHTE IKEA-API. Standaard uit; draaien met:
//   IKEA_INTEGRATIE=1 node --test src/lib/ikea-planner/client.integration.test.ts
// Gebruikt alleen het eigen fixture-ontwerp van Ilja (uuid uit __fixtures__/verwacht.json).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { haalOntwerp, haalProductenRuw } from "./client.ts";
import { bomIds, leesBom, positieIds, referentieIds } from "./bom.ts";
import { productUitApi, type ProductInfo } from "./product.ts";
import { bomNaarTelling } from "./telling.ts";
import { valideerTelling } from "../rekenen.ts";

const aan = process.env.IKEA_INTEGRATIE === "1";
const { uuid } = JSON.parse(readFileSync(new URL("./__fixtures__/verwacht.json", import.meta.url), "utf8"));

test("echte keten: ophalen → BOM → producten → geldige telling", { skip: !aan && "IKEA_INTEGRATIE niet gezet" }, async () => {
  const t0 = Date.now();
  const o = await haalOntwerp(uuid);
  const { bom } = leesBom(o.metadata);
  assert.match(o.bomSha256 ?? "", /^[0-9a-f]{64}$/);
  assert.ok(o.datumOpgeslagen);

  const producten: Record<string, ProductInfo> = {};
  for (const [id, p] of Object.entries(await haalProductenRuw([...bomIds(bom), ...positieIds(bom)]))) producten[id] = productUitApi(id, p);
  const refs = referentieIds(bom, producten);
  if (refs.length) for (const [id, p] of Object.entries(await haalProductenRuw(refs))) producten[id] = productUitApi(id, p);
  for (const id of bomIds(bom)) assert.ok(producten[id]?.omschrijving, `geen omschrijving voor ${id}`);

  const r = bomNaarTelling(bom, producten, { projectNaam: o.projectNaam, datumOpgeslagen: o.datumOpgeslagen });
  assert.equal(valideerTelling(r.telling).ok, true);
  assert.ok(r.telling.onderkasten > 0);
  assert.equal(r.prijscontrole.verschil, 0);
  console.log(`  ${uuid} "${o.projectNaam}": ${r.artikelen.length} artikelen in ${Date.now() - t0} ms`);
});
