// Tests voor de verwerkingscheck (requestStatus.retrieve). Draaien: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isEindstatus,
  parseRequestStatus,
  selecteerTeControleren,
  verwerkingMislukt,
  type UploadVoorControle,
} from "./ads-verwerking.ts";

const nu = new Date("2026-10-24T12:00:00Z");
const op = new Date("2026-10-24T12:00:01Z");

test("eindstatus: SUCCESS, PARTIAL_SUCCESS en FAILED; niet PROCESSING/UNKNOWN/null", () => {
  assert.equal(isEindstatus("SUCCESS"), true);
  assert.equal(isEindstatus("PARTIAL_SUCCESS"), true);
  assert.equal(isEindstatus("FAILED"), true);
  assert.equal(isEindstatus("PROCESSING"), false);
  assert.equal(isEindstatus("REQUEST_STATUS_UNKNOWN"), false);
  assert.equal(isEindstatus(null), false);
  assert.equal(isEindstatus(undefined), false);
});

test("parse: status, recordCount (string) en fout-/waarschuwingstellingen", () => {
  const v = parseRequestStatus(
    {
      requestStatusPerDestination: [
        {
          destination: { operatingAccount: { accountType: "GOOGLE_ADS", accountId: "3395836845" } },
          requestStatus: "PARTIAL_SUCCESS",
          eventsIngestionStatus: { recordCount: "7" },
          errorInfo: {
            errorCounts: [
              { recordCount: "2", reason: "PROCESSING_ERROR_REASON_CLICK_NOT_FOUND" },
              { recordCount: "1", reason: "PROCESSING_ERROR_REASON_EVENT_TOO_OLD" },
            ],
          },
          warningInfo: { warningCounts: [{ recordCount: "3", reason: "PROCESSING_WARNING_REASON_INTERNAL_ERROR" }] },
        },
      ],
    },
    op
  );
  assert.deepEqual(v, {
    status: "PARTIAL_SUCCESS",
    record_count: 7,
    error_info: [
      { reden: "PROCESSING_ERROR_REASON_CLICK_NOT_FOUND", aantal: 2 },
      { reden: "PROCESSING_ERROR_REASON_EVENT_TOO_OLD", aantal: 1 },
    ],
    warning_info: [{ reden: "PROCESSING_WARNING_REASON_INTERNAL_ERROR", aantal: 3 }],
    opgehaald_op: "2026-10-24T12:00:01.000Z",
  });
});

test("parse: lege velden → nulls en lege lijsten; onbekende status → REQUEST_STATUS_UNKNOWN", () => {
  const v = parseRequestStatus({ requestStatusPerDestination: [{ requestStatus: "PROCESSING" }] }, op);
  assert.equal(v.status, "PROCESSING");
  assert.equal(v.record_count, null);
  assert.deepEqual(v.error_info, []);
  assert.deepEqual(v.warning_info, []);
  assert.equal(v.fout, undefined);

  const w = parseRequestStatus({ requestStatusPerDestination: [{ requestStatus: "IETS_NIEUWS" }] }, op);
  assert.equal(w.status, "REQUEST_STATUS_UNKNOWN");
});

test("parse: zonder bestemming → status null met fout, zodat de volgende run opnieuw probeert", () => {
  const v = parseRequestStatus({}, op);
  assert.equal(v.status, null);
  assert.match(v.fout ?? "", /bestemming/);
  assert.equal(isEindstatus(v.status), false);

  const m = verwerkingMislukt("HTTP 503", op);
  assert.equal(m.status, null);
  assert.equal(m.fout, "HTTP 503");
});

const rijen: UploadVoorControle[] = [
  // 3 rijen van één request, >30 min oud, nog niet gecontroleerd
  { id: 1, request_id: "req-a", verzonden_op: "2026-10-24T05:13:00Z", verwerking: null },
  { id: 2, request_id: "req-a", verzonden_op: "2026-10-24T05:13:01Z", verwerking: null },
  { id: 3, request_id: "req-a", verzonden_op: "2026-10-24T05:13:02Z", verwerking: null },
  // te vers (10 min)
  { id: 4, request_id: "req-vers", verzonden_op: "2026-10-24T11:50:00Z", verwerking: null },
  // al eindstatus
  {
    id: 5,
    request_id: "req-klaar",
    verzonden_op: "2026-10-23T12:00:00Z",
    verwerking: { status: "SUCCESS", record_count: 1, error_info: [], warning_info: [], opgehaald_op: "2026-10-24T05:13:00Z" },
  },
  // nog in verwerking → opnieuw
  {
    id: 6,
    request_id: "req-bezig",
    verzonden_op: "2026-10-23T12:00:00Z",
    verwerking: { status: "PROCESSING", record_count: null, error_info: [], warning_info: [], opgehaald_op: "2026-10-24T05:13:00Z" },
  },
  // ophalen eerder mislukt (status null) → opnieuw
  { id: 7, request_id: "req-fout", verzonden_op: "2026-10-23T12:00:00Z", verwerking: verwerkingMislukt("HTTP 500", op) },
  // geen requestId (fout/overgeslagen/wachtend) → nooit
  { id: 8, request_id: null, verzonden_op: null, verwerking: null },
];

test("selectie: >30 min, geen eindstatus, één entry per requestId met alle rij-id's", () => {
  const sel = selecteerTeControleren(rijen, nu);
  assert.deepEqual(sel, [
    { requestId: "req-a", rijIds: [1, 2, 3] },
    { requestId: "req-bezig", rijIds: [6] },
    { requestId: "req-fout", rijIds: [7] },
  ]);
});

test("selectie: precies 30 minuten oud telt mee, 29 niet", () => {
  const sel = selecteerTeControleren(
    [
      { id: 1, request_id: "a", verzonden_op: "2026-10-24T11:30:00Z", verwerking: null },
      { id: 2, request_id: "b", verzonden_op: "2026-10-24T11:31:00Z", verwerking: null },
    ],
    nu
  );
  assert.deepEqual(sel.map((s) => s.requestId), ["a"]);
});

test("selectie met alles: wachttijd en eindstatus vervallen, rijen zonder requestId blijven weg", () => {
  const sel = selecteerTeControleren(rijen, nu, { alles: true });
  assert.deepEqual(sel.map((s) => s.requestId), ["req-a", "req-vers", "req-klaar", "req-bezig", "req-fout"]);
});
