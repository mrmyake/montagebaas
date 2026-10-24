// Maakt de gecommitte fixture voor de planner-link uit één IKEA-ontwerp.
// Gebruik ALLEEN voor een eigen ontwerp (nooit een klantontwerp — geen klantdata in git):
//   node scripts/maak-planner-fixture.ts <planner-url of uuid>
//
// Schrijft naar src/lib/ikea-planner/__fixtures__/:
//   ontwerp.json   — bom_ruw (exacte string), opstelling + projectvelden zonder account-id's
//   producten.json — ProductInfo per id (alleen de ids uit dit ontwerp)
//   verwacht.json  — uuid, bom-hash en de telling; de dagelijkse monitor vergelijkt hiermee
// Daarna: `npm test` en de verwachte telling in verwacht.json met de hand nalopen.
import { writeFileSync, mkdirSync } from "node:fs";
import { haalOntwerp, haalProductenRuw } from "../src/lib/ikea-planner/client.ts";
import { bomIds, leesBom, positieIds, referentieIds } from "../src/lib/ikea-planner/bom.ts";
import { productUitApi, type ProductInfo } from "../src/lib/ikea-planner/product.ts";
import { parsePlannerLink } from "../src/lib/ikea-planner/link.ts";
import { bomNaarTelling } from "../src/lib/ikea-planner/telling.ts";
import { leesOpstelling } from "../src/lib/ikea-planner/opstelling.ts";

const arg = process.argv[2] ?? "";
const uuid = parsePlannerLink(arg).ok
  ? (parsePlannerLink(arg) as { uuid: string }).uuid
  : /^[0-9a-f-]{36}$/i.test(arg)
    ? arg.toUpperCase()
    : null;
if (!uuid) throw new Error("Geef een planner-link of ontwerp-UUID op.");

const ontwerp = await haalOntwerp(uuid);
const { bom } = leesBom(ontwerp.metadata);

const producten: Record<string, ProductInfo> = {};
const voegToe = async (ids: string[]) => {
  const ruw = await haalProductenRuw(ids);
  for (const [id, p] of Object.entries(ruw)) producten[id] = productUitApi(id, p);
};
await voegToe([...bomIds(bom), ...positieIds(bom)]);
const refs = referentieIds(bom, producten);
if (refs.length) await voegToe(refs);

const opstelling = leesOpstelling(ontwerp.metadata);
const { telling } = bomNaarTelling(bom, producten, {
  opstelling,
  projectNaam: ontwerp.projectNaam,
  datumOpgeslagen: ontwerp.datumOpgeslagen,
});

const dir = new URL("../src/lib/ikea-planner/__fixtures__/", import.meta.url);
mkdirSync(dir, { recursive: true });
const schrijf = (naam: string, data: unknown) =>
  writeFileSync(new URL(naam, dir), JSON.stringify(data, null, 1) + "\n");

schrijf("ontwerp.json", {
  uuid,
  // Bewust zonder userID/projectID/S3-URL: alleen wat de mapping en de versievastlegging nodig hebben.
  project: {
    projectName: ontwerp.projectNaam,
    dateCreation: ontwerp.datumAangemaakt,
    dateUpdate: ontwerp.datumOpgeslagen,
    is_locked: ontwerp.vergrendeld,
  },
  bom_sha256: ontwerp.bomSha256,
  bom_ruw: ontwerp.bomRuw,
  // Alleen muren en posities (uuid, plaats, ruggelings): genoeg voor de eilanddetectie.
  opstelling,
});
schrijf("producten.json", producten);
schrijf("verwacht.json", { uuid, bom_sha256: ontwerp.bomSha256, telling });

console.log(`Fixture geschreven voor ${uuid} "${ontwerp.projectNaam}" (${Object.keys(producten).length} producten).`);
