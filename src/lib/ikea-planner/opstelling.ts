/**
 * De plaatsing van het ontwerp (`appData.projectInfo` uit metadata/2): muren en
 * waar elke positie staat. PUUR. Gebruikt om een eiland te herkennen; de
 * positienamen zeggen dat nooit ("eiland" komt er niet in voor).
 *
 * Een positie staat in een eiland als ze ruggelings geplaatst is (IKEA zet dan
 * `isBackToBack`), of als ze verder dan EILAND_AFSTAND_MM van elke muur staat.
 * De coördinaat is het midden van de kast: tegen de muur is ±375 mm, een
 * hoekkast 410–510 mm, een eiland in de spike 1.000–2.100 mm.
 */

export const EILAND_AFSTAND_MM = 800;

type Punt = [number, number];

export interface Opstelling {
  muren: [Punt, Punt][];
  posities: { uuid: string; x: number; y: number; ruggelings: boolean }[];
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const getal = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function punt(v: unknown): Punt | null {
  const p = Array.isArray(v) ? { x: v[0], y: v[1] } : obj(v);
  const x = getal(p.x), y = getal(p.y);
  return x === null || y === null ? null : [x, y];
}

/**
 * Leest de opstelling uit een metadata/2-antwoord. Geeft null als er geen
 * (leesbare) projectInfo is: dan weten we niets over een eiland.
 */
export function leesOpstelling(metadata: unknown): Opstelling | null {
  const ruw = obj(obj(metadata).appData).projectInfo;
  let info: Obj;
  try {
    info = obj(typeof ruw === "string" ? JSON.parse(ruw) : ruw);
  } catch {
    return null;
  }
  if (!Array.isArray(info.products)) return null;

  const muren: [Punt, Punt][] = [];
  for (const m of Array.isArray(info.walls) ? info.walls : []) {
    const a = punt(obj(m).startPoint), b = punt(obj(m).endPoint);
    if (a && b) muren.push([a, b]);
  }

  const posities: Opstelling["posities"] = [];
  for (const p of info.products as unknown[]) {
    const ctx = obj(p).contextParameters;
    const params = Array.isArray(ctx) ? ctx.map(obj) : [];
    // Alleen wat IKEA als kast in een opstelling ziet (heeft de isBackToBack-parameter);
    // losse artikelen en panelen niet.
    const b2b = params.find((c) => c.id === "isBackToBack");
    const t = obj(p).transfo;
    if (!b2b || !Array.isArray(t)) continue;
    const x = getal(t[12]), y = getal(t[13]);
    if (x === null || y === null) continue;
    posities.push({ uuid: String(obj(p).uuid ?? ""), x, y, ruggelings: b2b.val === true });
  }
  return { muren, posities };
}

function afstandTotLijnstuk([px, py]: Punt, [[ax, ay], [bx, by]]: [Punt, Punt]): number {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** De uuid's van de posities die in een eiland staan (leeg = geen eiland). */
export function eilandPosities(o: Opstelling): Set<string> {
  const uit = new Set<string>();
  for (const p of o.posities) {
    const vrij =
      o.muren.length > 0 && Math.min(...o.muren.map((m) => afstandTotLijnstuk([p.x, p.y], m))) > EILAND_AFSTAND_MM;
    if (p.ruggelings || vrij) uit.add(p.uuid);
  }
  return uit;
}
