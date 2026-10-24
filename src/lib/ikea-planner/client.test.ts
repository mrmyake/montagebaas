// HTTP-keten met een gestubde fetch: retry, timeout en foutcategorieën.
// Draaien: `npm test`. Geen echte requests naar IKEA (zie client.integration.test.ts).
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { haalOntwerp, haalProductenRuw, parseIkeaTijd, vergeetToken } from "./client.ts";
import { PlannerFout } from "./fouten.ts";

const UUID = "36FDA15A-7C94-436F-ABEA-0C4BEB046ED6";
const echteFetch = globalThis.fetch;
let calls: string[] = [];

type Antwoord = Response | (() => Response) | Error;
/** Stub per URL-fragment; een array = opeenvolgende antwoorden. */
function stub(routes: Record<string, Antwoord | Antwoord[]>) {
  const tellers = new Map<string, number>();
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    // Langste passende sleutel wint: "/metadata/2" gaat vóór "/3/projects/".
    const sleutel = Object.keys(routes)
      .filter((k) => url.includes(k))
      .sort((a, b) => b.length - a.length)[0];
    if (!sleutel) throw new Error(`onverwachte call ${url}`);
    const r = routes[sleutel];
    const lijst = Array.isArray(r) ? r : [r];
    const i = tellers.get(sleutel) ?? 0;
    tellers.set(sleutel, i + 1);
    const a = lijst[Math.min(i, lijst.length - 1)];
    if (a instanceof Error) throw a;
    return typeof a === "function" ? a() : a.clone();
  }) as typeof fetch;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

const tokenRoutes = {
  "/csrf-token": () =>
    new Response("", { status: 200, headers: { "x-csrf-token": "csrf123", "set-cookie": "__Secure-token=abc; Path=/" } }),
  "/legal-entity-token": () => json({ token: "tok", expirationTimestamp: "20991231T000000Z" }),
};

const timeoutFout = () => Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });

const projectCalls = () => calls.filter((c) => c.includes("/3/projects/") && !c.includes("/metadata/")).length;

beforeEach(() => {
  calls = [];
  vergeetToken();
});
afterEach(() => {
  globalThis.fetch = echteFetch;
});

async function verwachtFout(p: Promise<unknown>, categorie: string) {
  await assert.rejects(p, (e: unknown) => e instanceof PlannerFout && e.categorie === categorie);
}

test("haalOntwerp: project + metadata/2 → versiegegevens en sha256 over de exacte BOM-string", async () => {
  const bomRuw = JSON.stringify({ products: [] });
  stub({
    ...tokenRoutes,
    [`/3/projects/${UUID}?`]: json({ projectName: "Bajes", dateCreation: "2026-10-21T13:22:41.000Z", dateUpdate: "2026-10-22T14:45:20.000Z", is_locked: false }),
    "/metadata/2": json({ appData: { bom: bomRuw } }, 200, { etag: 'W/"abc"' }),
  });
  const o = await haalOntwerp(UUID);
  assert.equal(o.projectNaam, "Bajes");
  assert.equal(o.datumOpgeslagen, "2026-10-22T14:45:20.000Z");
  assert.equal(o.vergrendeld, false);
  assert.equal(o.versieTag, 'W/"abc"');
  assert.equal(o.bomRuw, bomRuw);
  assert.equal(o.bomSha256, createHash("sha256").update(bomRuw).digest("hex"));
  // token wordt hergebruikt: tweede ontwerp haalt geen nieuw token
  await haalOntwerp(UUID);
  assert.equal(calls.filter((c) => c.includes("csrf-token")).length, 1);
});

test("404 BM_201 → niet_gevonden, zonder retry", async () => {
  stub({ ...tokenRoutes, "/3/projects/": json({ id: "BM_201", message: "Project does not exist or wrong format" }, 404) });
  await verwachtFout(haalOntwerp(UUID), "niet_gevonden");
  assert.equal(projectCalls(), 1);
});

test("403 → ikea_fout, zonder retry", async () => {
  stub({ ...tokenRoutes, "/3/projects/": json({ id: "BM_0014" }, 403) });
  await verwachtFout(haalOntwerp(UUID), "ikea_fout");
  assert.equal(projectCalls(), 1);
});

test("500 daarna 200 → één retry, slaagt", async () => {
  stub({
    ...tokenRoutes,
    "/3/projects/": [new Response("boem", { status: 500 }), json({ projectName: "x" })],
    "/metadata/2": json({ appData: { bom: "{}" } }),
  });
  const o = await haalOntwerp(UUID);
  assert.equal(o.projectNaam, "x");
  assert.equal(projectCalls(), 2);
});

test("twee keer 500 → ikea_fout na precies één retry", async () => {
  stub({ ...tokenRoutes, "/3/projects/": new Response("boem", { status: 500 }) });
  await verwachtFout(haalOntwerp(UUID), "ikea_fout");
  assert.equal(projectCalls(), 2);
});

test("twee keer timeout → timeout", async () => {
  stub({ ...tokenRoutes, "/3/projects/": timeoutFout() });
  await verwachtFout(haalOntwerp(UUID), "timeout");
  assert.equal(projectCalls(), 2);
});

test("token-keten kapot (geen csrf-header) → ikea_fout", async () => {
  stub({ "/csrf-token": () => new Response("", { status: 200 }) });
  await verwachtFout(haalOntwerp(UUID), "ikea_fout");
});

test("legal-entity-token 500 → ikea_fout", async () => {
  stub({ "/csrf-token": tokenRoutes["/csrf-token"], "/legal-entity-token": new Response("Internal server error", { status: 500 }) });
  await verwachtFout(haalOntwerp(UUID), "ikea_fout");
});

test("geen JSON → onverwachte_structuur", async () => {
  stub({ ...tokenRoutes, "/3/projects/": new Response("<html>", { status: 200 }) });
  await verwachtFout(haalOntwerp(UUID), "onverwachte_structuur");
});

test("haalProductenRuw: batches van 40, sequentieel, onbekende ids ontbreken", async () => {
  let tegelijk = 0;
  let maxTegelijk = 0;
  const ids = Array.from({ length: 85 }, (_, i) => `ART-${String(i).padStart(8, "0")}-NL`);
  stub(tokenRoutes);
  const stubFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (!url.includes("/3/products?")) return stubFetch(input, init);
    calls.push(url);
    tegelijk++;
    maxTegelijk = Math.max(maxTegelijk, tegelijk);
    await new Promise((r) => setTimeout(r, 5));
    tegelijk--;
    const gevraagd = [...new URL(url).searchParams.getAll("ids[]")];
    return json(Object.fromEntries(gevraagd.filter((id) => id !== ids[3]).map((id) => [id, { definition: { name: "X" } }])));
  }) as typeof fetch;
  const uit = await haalProductenRuw(ids);
  assert.equal(calls.filter((c) => c.includes("/3/products?")).length, 3);
  assert.equal(maxTegelijk, 1);
  assert.equal(Object.keys(uit).length, 84);
  assert.equal(uit[ids[3]], undefined);
});

test("parseIkeaTijd", () => {
  assert.equal(parseIkeaTijd("20261025T074826Z"), Date.UTC(2026, 9, 25, 7, 48, 26));
  assert.equal(parseIkeaTijd("onzin"), null);
});
