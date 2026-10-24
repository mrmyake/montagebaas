/**
 * HTTP-keten naar de IKEA/HomeByMe-backend, zonder browser (zie
 * spikes/ikea-planner/VERKENNING.md voor hoe deze keten gevonden is):
 *
 *   1. csrf-token          → header x-csrf-token + cookies
 *   2. legal-entity-token  → { token } (leesrecht, 24 uur geldig, niet projectgebonden)
 *   3. /3/projects/<uuid>  + /api/3/projects/<uuid>/metadata/2 (appData.bom)
 *   4. /3/products?ids[]=… voor naam/omschrijving/maat
 *
 * Ongedocumenteerde API: daarom per call een timeout, hooguit één retry bij een
 * tijdelijke fout, en alles sequentieel (geen parallelle bursts naar IKEA).
 */
import { createHash } from "node:crypto";
import { PlannerFout, classificeerHttp, isTijdelijkeStatus } from "./fouten.ts";

const IHP = "https://api.kitchen.planner.ikea.com";
const BYME = "https://platform.ikea-prod.by.me";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";
const NL_TAAL_ID = 24;
const TIMEOUT_MS = 8000;
const RETRY_PAUZE_MS = 1000;
const PRODUCTEN_PER_CALL = 40;

const IHP_HEADERS = {
  "user-agent": UA,
  "x-ihp-environment-override": "ProdRange",
  "x-ihp-environment-stage": "main",
  "x-ihp-language-code": "nl",
  "x-ihp-retail-unit": "nl",
};

const pauze = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch met timeout en maximaal één retry (alleen bij timeout, netwerkfout of
 * 5xx). Geeft de Response pas terug als hij ok is; anders een PlannerFout.
 */
async function haal(url: string, headers: Record<string, string>, wat: string): Promise<Response> {
  let laatste: PlannerFout | undefined;
  for (let poging = 0; poging < 2; poging++) {
    if (poging > 0) await pauze(RETRY_PAUZE_MS);
    let res: Response;
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    } catch (e) {
      const isTimeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      laatste = new PlannerFout(isTimeout ? "timeout" : "ikea_fout", `${wat}: ${isTimeout ? "timeout" : (e as Error)?.message}`);
      continue;
    }
    if (res.ok) return res;
    laatste = classificeerHttp(res.status, await res.text().catch(() => ""), wat);
    if (!isTijdelijkeStatus(res.status)) break;
  }
  throw laatste!;
}

async function haalJson(url: string, headers: Record<string, string>, wat: string) {
  const res = await haal(url, headers, wat);
  const raw = await res.text();
  try {
    return { json: JSON.parse(raw) as unknown, raw, etag: res.headers.get("etag") };
  } catch {
    throw new PlannerFout("onverwachte_structuur", `${wat}: geen JSON (${raw.slice(0, 100)})`);
  }
}

// ---------------------------------------------------------------------------
// Token. Per Fluid-instance in het geheugen tot 5 min vóór verloop; een koude
// start haalt gewoon een nieuwe (~0,3 s). Bewust geen gedeelde cache.
// ---------------------------------------------------------------------------

let tokenCache: { token: string; geldigTot: number } | undefined;
export const vergeetToken = () => {
  tokenCache = undefined;
};

/** '20261025T074826Z' → epoch ms */
export function parseIkeaTijd(s: unknown): number | null {
  const m = String(s).match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
}

export async function haalToken(): Promise<string> {
  if (tokenCache && tokenCache.geldigTot > Date.now() + 5 * 60_000) return tokenCache.token;

  const csrfRes = await haal(`${IHP}/services/green/csrf-token`, IHP_HEADERS, "csrf-token");
  const csrf = csrfRes.headers.get("x-csrf-token");
  if (!csrf) throw new PlannerFout("ikea_fout", `csrf-token: header x-csrf-token ontbreekt (${csrfRes.status})`);
  const cookie = csrfRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  const { json } = await haalJson(
    `${IHP}/services/green/legal-entity-token`,
    { ...IHP_HEADERS, "x-csrf-token": csrf, cookie },
    "legal-entity-token"
  );
  const { token, expirationTimestamp } = (json ?? {}) as { token?: unknown; expirationTimestamp?: unknown };
  if (typeof token !== "string" || !token) {
    throw new PlannerFout("ikea_fout", "legal-entity-token: geen token in antwoord");
  }
  tokenCache = { token, geldigTot: parseIkeaTijd(expirationTimestamp) ?? Date.now() + 60 * 60_000 };
  return token;
}

/** HomeByMe eist een `timestamp`-header (anders 403 BM_004). */
const ikeaTimestamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

async function byme(pad: string, wat: string) {
  return haalJson(`${BYME}${pad}`, { "user-agent": UA, token: await haalToken(), timestamp: ikeaTimestamp() }, wat);
}

// ---------------------------------------------------------------------------
// Ontwerp
// ---------------------------------------------------------------------------

export interface OpgehaaldOntwerp {
  uuid: string;
  project: Record<string, unknown>;
  metadata: unknown; // ruwe metadata/2; `leesBom` haalt er de BOM uit
  bomRuw: string | null;
  bomSha256: string | null;
  versieTag: string | null; // ETag van metadata/2
  projectNaam: string | null;
  datumAangemaakt: string | null;
  datumOpgeslagen: string | null;
  vergrendeld: boolean | null;
}

const tekst = (v: unknown) => (typeof v === "string" ? v : null);

export async function haalOntwerp(uuid: string): Promise<OpgehaaldOntwerp> {
  const project = (await byme(`/3/projects/${uuid}?encode=true`, "project")).json as Record<string, unknown>;
  if (!project || typeof project !== "object") {
    throw new PlannerFout("onverwachte_structuur", "project: geen object");
  }
  const meta = await byme(`/api/3/projects/${uuid}/metadata/2?encode=true`, "metadata/2");
  const bomRuw = tekst((meta.json as { appData?: { bom?: unknown } })?.appData?.bom);
  return {
    uuid,
    project,
    metadata: meta.json,
    bomRuw,
    bomSha256: bomRuw === null ? null : createHash("sha256").update(bomRuw).digest("hex"),
    versieTag: meta.etag,
    projectNaam: tekst(project.projectName),
    datumAangemaakt: tekst(project.dateCreation),
    datumOpgeslagen: tekst(project.dateUpdate),
    vergrendeld: typeof project.is_locked === "boolean" ? project.is_locked : null,
  };
}

/**
 * Ruwe productdefinities per id. Batches van 40, één voor één. Ids die IKEA
 * niet kent ontbreken in het resultaat.
 */
export async function haalProductenRuw(ids: string[]): Promise<Record<string, unknown>> {
  const uit: Record<string, unknown> = {};
  for (let i = 0; i < ids.length; i += PRODUCTEN_PER_CALL) {
    const deel = ids.slice(i, i + PRODUCTEN_PER_CALL);
    const qs =
      `languageID=${NL_TAAL_ID}&` +
      deel.map((id) => `ids[]=${encodeURIComponent(id)}`).join("&") +
      "&expand[]=parameterDefinition";
    const { json } = await byme(`/3/products?${qs}`, "products");
    if (!json || typeof json !== "object") throw new PlannerFout("onverwachte_structuur", "products: geen object");
    for (const id of deel) {
      const p = (json as Record<string, unknown>)[id];
      if (p) uit[id] = p;
    }
  }
  return uit;
}
