/**
 * Pure kant van de verwerkingscheck (geen server-only imports; getest in
 * ads-verwerking.test.ts). Een geslaagde events:ingest geeft alleen een
 * requestId; of Google de events daarna echt heeft verwerkt, staat in
 * GET v1/requestStatus:retrieve?requestId=… Dit bestand zet dat antwoord om
 * naar wat we in ads_conversie_uploads.verwerking bewaren en bepaalt welke
 * requestIds nog gecontroleerd moeten worden.
 *
 * Enum uit het discovery-document (v1): REQUEST_STATUS_UNKNOWN, SUCCESS,
 * PROCESSING, FAILED, PARTIAL_SUCCESS. (De API kent FAILED, niet FAILURE.)
 */

export const REQUEST_STATUS_URL = "https://datamanager.googleapis.com/v1/requestStatus:retrieve";

export type RequestStatus =
  | "REQUEST_STATUS_UNKNOWN"
  | "SUCCESS"
  | "PROCESSING"
  | "FAILED"
  | "PARTIAL_SUCCESS";

export const EINDSTATUSSEN: readonly RequestStatus[] = ["SUCCESS", "PARTIAL_SUCCESS", "FAILED"];

/** Minimaal 30 minuten na verzending voordat we de status opvragen. */
export const CONTROLE_WACHTTIJD_MS = 30 * 60 * 1000;

export interface AantalPerReden {
  reden: string;
  aantal: number;
}

/** Wat we per upload-rij in de kolom `verwerking` (jsonb) bewaren. */
export interface Verwerking {
  /** null = ophalen mislukt (zie `fout`); de volgende run probeert opnieuw. */
  status: RequestStatus | null;
  /** eventsIngestionStatus.recordCount: aantal verwerkte events, of null als Google het niet meldt. */
  record_count: number | null;
  error_info: AantalPerReden[];
  warning_info: AantalPerReden[];
  opgehaald_op: string;
  /** Alleen gevuld als de retrieve zelf mislukte (HTTP-fout, geen bestemming in het antwoord). */
  fout?: string;
}

export function isEindstatus(status: string | null | undefined): boolean {
  return EINDSTATUSSEN.includes(status as RequestStatus);
}

/** Ruwe vorm van RetrieveRequestStatusResponse, alleen de velden die we gebruiken. */
interface RuwAantal {
  recordCount?: string | number;
  reason?: string;
}
export interface RuwRequestStatusResponse {
  requestStatusPerDestination?: {
    requestStatus?: string;
    eventsIngestionStatus?: { recordCount?: string | number };
    errorInfo?: { errorCounts?: RuwAantal[] };
    warningInfo?: { warningCounts?: RuwAantal[] };
  }[];
}

function naarAantal(v: string | number | undefined): number | null {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function naarLijst(items: RuwAantal[] | undefined): AantalPerReden[] {
  return (items ?? []).map((i) => ({
    reden: i.reason ?? "ONBEKEND",
    aantal: naarAantal(i.recordCount) ?? 0,
  }));
}

/**
 * Zet het API-antwoord om naar `Verwerking`. We sturen per request precies één
 * bestemming, dus we lezen de eerste; zonder bestemming is het antwoord
 * onbruikbaar en wordt dat als fout bewaard (status null → opnieuw proberen).
 */
export function parseRequestStatus(body: unknown, opgehaaldOp: Date = new Date()): Verwerking {
  const r = (body ?? {}) as RuwRequestStatusResponse;
  const d = r.requestStatusPerDestination?.[0];
  const basis = { error_info: [], warning_info: [], opgehaald_op: opgehaaldOp.toISOString() };
  if (!d) {
    return { ...basis, status: null, record_count: null, fout: "Geen bestemming in het antwoord." };
  }
  const status = d.requestStatus;
  const geldig: RequestStatus[] = ["REQUEST_STATUS_UNKNOWN", "SUCCESS", "PROCESSING", "FAILED", "PARTIAL_SUCCESS"];
  return {
    ...basis,
    status: geldig.includes(status as RequestStatus) ? (status as RequestStatus) : "REQUEST_STATUS_UNKNOWN",
    record_count: naarAantal(d.eventsIngestionStatus?.recordCount),
    error_info: naarLijst(d.errorInfo?.errorCounts),
    warning_info: naarLijst(d.warningInfo?.warningCounts),
  };
}

/** Wat we bewaren als de retrieve zelf niet lukte. */
export function verwerkingMislukt(fout: string, opgehaaldOp: Date = new Date()): Verwerking {
  return {
    status: null,
    record_count: null,
    error_info: [],
    warning_info: [],
    opgehaald_op: opgehaaldOp.toISOString(),
    fout,
  };
}

export interface UploadVoorControle {
  id: number;
  request_id: string | null;
  verzonden_op: string | null;
  verwerking: Verwerking | null;
}

export interface TeControlerenRequest {
  requestId: string;
  rijIds: number[];
}

/**
 * Welke requestIds moet de cron opvragen? Verstuurde rijen met requestId,
 * ouder dan 30 minuten, zonder eindstatus. Met `alles` vervallen wachttijd
 * en eindstatus-filter (eenmalige volledige hercontrole). Eén entry per
 * requestId, met alle rij-id's die dat requestId delen.
 */
export function selecteerTeControleren(
  rijen: UploadVoorControle[],
  nu: Date = new Date(),
  opties: { alles?: boolean } = {}
): TeControlerenRequest[] {
  const grens = nu.getTime() - CONTROLE_WACHTTIJD_MS;
  const per = new Map<string, number[]>();
  for (const r of rijen) {
    if (!r.request_id) continue;
    if (!opties.alles) {
      if (!r.verzonden_op || new Date(r.verzonden_op).getTime() > grens) continue;
      if (isEindstatus(r.verwerking?.status)) continue;
    }
    const lijst = per.get(r.request_id) ?? [];
    lijst.push(r.id);
    per.set(r.request_id, lijst);
  }
  return [...per.entries()].map(([requestId, rijIds]) => ({ requestId, rijIds }));
}
