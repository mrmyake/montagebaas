// Regressietest voor de ntfy-timeout. Draaien: `npm test`.
//
// Aanleiding: een hangende ntfy.sh hield het antwoordpad van de upload-route
// vast (route.ts riep stuurNtfy met await aan vóór de respons). De aanvraag
// stond dan al in de database, maar de bezoeker kreeg nooit antwoord en dus
// nooit de redirect naar /bedankt. stuurNtfy moet daarom hoe dan ook opgeven,
// nooit gooien, en de misser altijd loggen.
//
// Node's ingebouwde testrunner + native TS type-stripping, geen dependency.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stuurNtfy } from "./ntfy.ts";

const OPTS = { title: "Testmelding", body: "regel" };

/** Vervangt globalThis.fetch voor de duur van fn en herstelt hem daarna. */
async function metFetch<T>(nep: typeof fetch, fn: () => Promise<T>): Promise<T> {
  const origineel = globalThis.fetch;
  globalThis.fetch = nep;
  try {
    return await fn();
  } finally {
    globalThis.fetch = origineel;
  }
}

/** Vangt console.error op zodat we kunnen controleren dát er gelogd is. */
async function metGevangenErrors(fn: () => Promise<void>): Promise<string[]> {
  const origineel = console.error;
  const regels: string[] = [];
  console.error = (...args: unknown[]) => {
    regels.push(args.map((a) => String(a)).join(" "));
  };
  try {
    await fn();
    return regels;
  } finally {
    console.error = origineel;
  }
}

/** fetch die nooit antwoordt, maar het abort-signal wél respecteert. */
const hangendeFetch = ((_url: unknown, init?: RequestInit) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => {
      const err = new Error("The operation was aborted due to timeout");
      err.name = "TimeoutError";
      reject(err);
    });
  })) as unknown as typeof fetch;

test("stuurNtfy geeft een abort-signal mee aan fetch", async () => {
  process.env.NTFY_TOPIC = "test-topic";
  let gezien: RequestInit | undefined;
  const nep = (async (_url: unknown, init?: RequestInit) => {
    gezien = init;
    return new Response("ok", { status: 200 });
  }) as unknown as typeof fetch;

  await metFetch(nep, () => stuurNtfy(OPTS));

  assert.ok(
    gezien?.signal instanceof AbortSignal,
    "zonder AbortSignal kan een hangende ntfy.sh nooit afgebroken worden"
  );
});

test("een hangende ntfy.sh laat stuurNtfy niet gooien en niet oneindig wachten", async () => {
  process.env.NTFY_TOPIC = "test-topic";
  const start = Date.now();

  const regels = await metGevangenErrors(() =>
    metFetch(hangendeFetch, () => stuurNtfy(OPTS))
  );
  const verstreken = Date.now() - start;

  // Het punt van de hele wijziging: dit keert terug in plaats van te blijven hangen.
  assert.ok(
    verstreken < 8000,
    `stuurNtfy moet binnen de timeout opgeven, duurde ${verstreken} ms`
  );
  // En het moet zichtbaar zijn dat de melding gemist is.
  assert.ok(
    regels.some((r) => r.includes("GEMIST")),
    `verwachtte een GEMIST-logregel, kreeg: ${JSON.stringify(regels)}`
  );
});

test("een netwerkfout wordt gelogd als GEMIST en gooit niet door", async () => {
  process.env.NTFY_TOPIC = "test-topic";
  const stukkeFetch = (() =>
    Promise.reject(new Error("ECONNREFUSED"))) as unknown as typeof fetch;

  const regels = await metGevangenErrors(() =>
    metFetch(stukkeFetch, () => stuurNtfy(OPTS))
  );

  assert.ok(regels.some((r) => r.includes("GEMIST")));
});

test("een niet-ok status wordt gelogd als GEMIST", async () => {
  process.env.NTFY_TOPIC = "test-topic";
  const foutFetch = (async () =>
    new Response("nope", { status: 503 })) as unknown as typeof fetch;

  const regels = await metGevangenErrors(() =>
    metFetch(foutFetch, () => stuurNtfy(OPTS))
  );

  assert.ok(regels.some((r) => r.includes("GEMIST") && r.includes("503")));
});

test("zonder NTFY_TOPIC gebeurt er niets en wordt er niet gelogd", async () => {
  delete process.env.NTFY_TOPIC;
  let aangeroepen = false;
  const nep = (async () => {
    aangeroepen = true;
    return new Response("ok");
  }) as unknown as typeof fetch;

  const regels = await metGevangenErrors(() => metFetch(nep, () => stuurNtfy(OPTS)));

  assert.equal(aangeroepen, false);
  assert.deepEqual(regels, []);
});
