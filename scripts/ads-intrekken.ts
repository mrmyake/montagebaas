// Eenmalig: een al verstuurde Ads-conversie intrekken (RETRACTION) op basis van
// het id in montagebaas.ads_conversie_uploads.
//
//   node --env-file=.env.local scripts/ads-intrekken.ts 79 111          # alleen tonen
//   node --env-file=.env.local scripts/ads-intrekken.ts 79 111 --echt   # echt intrekken
//
// Waarom de Google Ads API: we uploaden via de Data Manager API (events:ingest), en
// die kan een conversie wel aanpassen maar niet intrekken. Intrekken gaat via
// ConversionAdjustmentUploadService (uploadConversionAdjustments, RETRACTION) op
// order_id = ons transactionId "{aanvraag_id}:{actie}".
//
// Nodig voor --echt (naast DATABASE_URL, GOOGLE_SA_KEY_JSON, ADS_CUSTOMER_ID en
// ADS_CONVERSIE_ACTIE_*): GOOGLE_ADS_DEVELOPER_TOKEN, het service account als
// gebruiker in het Ads-account, en de Google Ads API aan in het GCP-project.
// Optioneel: ADS_LOGIN_CUSTOMER_ID (via een manageraccount), ADS_API_VERSIE (standaard v26).
import * as nodeModule from "node:module";
import { normaliseerCustomerId, transactionId, type ConversieActie } from "../src/lib/ads-conversies.ts";

const ACTIE_ENV: Record<ConversieActie, string> = {
  aanvraag_ontvangen: "ADS_CONVERSIE_ACTIE_AANVRAAG_ONTVANGEN",
  offerte_verstuurd: "ADS_CONVERSIE_ACTIE_OFFERTE_VERSTUURD",
  opdracht_gewonnen: "ADS_CONVERSIE_ACTIE_OPDRACHT_GEWONNEN",
};

const args = process.argv.slice(2);
const echt = args.includes("--echt");
const ids = args.filter((a) => /^\d+$/.test(a)).map(Number);
if (!ids.length) throw new Error("Geef één of meer ids uit ads_conversie_uploads op.");

const customerId = normaliseerCustomerId(process.env.ADS_CUSTOMER_ID ?? "");
if (!customerId) throw new Error("ADS_CUSTOMER_ID ontbreekt.");

const pg = nodeModule.createRequire(import.meta.url)("pg");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const { rows } = await db.query(
  `select u.id, u.aanvraag_id, u.conversie_actie, u.status, u.waarde, u.verzonden_op, u.reden, a.naam, a.email
     from montagebaas.ads_conversie_uploads u join montagebaas.aanvragen a on a.id = u.aanvraag_id
    where u.id = any($1) order by u.id`,
  [ids]
);
const ontbreekt = ids.filter((id) => !rows.some((r: { id: string }) => Number(r.id) === id));
if (ontbreekt.length) throw new Error(`Niet gevonden in ads_conversie_uploads: ${ontbreekt.join(", ")}`);

// Google Ads wil "yyyy-mm-dd HH:mm:ss+HH:mm"; na het conversiemoment, dus nu.
const nu = new Date().toISOString().replace("T", " ").slice(0, 19) + "+00:00";

const adjustments = rows.map((r: { id: string; aanvraag_id: string; conversie_actie: ConversieActie; status: string }) => {
  if (r.status !== "verstuurd") throw new Error(`Upload ${r.id} heeft status ${r.status}; alleen verstuurde conversies kunnen worden ingetrokken.`);
  const actionId = process.env[ACTIE_ENV[r.conversie_actie]]?.trim();
  if (!actionId) throw new Error(`${ACTIE_ENV[r.conversie_actie]} ontbreekt.`);
  return {
    conversionAction: `customers/${customerId}/conversionActions/${actionId}`,
    adjustmentType: "RETRACTION",
    orderId: transactionId(r.aanvraag_id, r.conversie_actie),
    adjustmentDateTime: nu,
  };
});

console.log(echt ? "INTREKKEN (echt):" : "Alleen tonen (geen --echt), er gaat niets naar Google:");
rows.forEach((r: Record<string, unknown>, i: number) =>
  console.log(`  upload ${r.id} | ${r.naam} <${r.email}> | ${r.conversie_actie} | €${r.waarde} (log) | verstuurd ${(r.verzonden_op as Date)?.toISOString()} | order_id ${adjustments[i].orderId}`)
);

if (!echt) {
  await db.end();
  process.exit(0);
}

const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
if (!developerToken) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN ontbreekt (Google Ads API Center van het manageraccount).");
const versie = process.env.ADS_API_VERSIE?.trim() || "v26";
const login = process.env.ADS_LOGIN_CUSTOMER_ID ? normaliseerCustomerId(process.env.ADS_LOGIN_CUSTOMER_ID) : null;

// google-auth.ts importeert "server-only" (alleen binnen Next.js beschikbaar): buiten Next leeg laten.
// registerHooks bestaat in Node 23.5+, maar staat nog niet in de @types/node van dit project.
type Volgende = (spec: string, ctx: unknown) => unknown;
const { registerHooks } = nodeModule as unknown as {
  registerHooks: (h: { resolve: (spec: string, ctx: unknown, next: Volgende) => unknown }) => void;
};
registerHooks({
  resolve: (spec, ctx, next) =>
    spec === "server-only" ? { url: "data:text/javascript,", shortCircuit: true } : next(spec, ctx),
});
const { googleAccessToken } = await import("../src/lib/google-auth.ts");
const token = await googleAccessToken("https://www.googleapis.com/auth/adwords");
const res = await fetch(`https://googleads.googleapis.com/${versie}/customers/${customerId}:uploadConversionAdjustments`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "developer-token": developerToken,
    ...(login ? { "login-customer-id": login } : {}),
    "content-type": "application/json",
  },
  body: JSON.stringify({ conversionAdjustments: adjustments, partialFailure: true }),
});
const body = await res.json().catch(() => ({ raw: "geen json" }));
console.log(`HTTP ${res.status}`);
console.log(JSON.stringify(body, null, 2));

// partialFailure: een mislukte rij staat in partialFailureError.details (met de index);
// geslaagde rijen hebben een niet-leeg resultaat met orderId.
const gelukt = res.ok
  ? (body.results ?? []).map((x: { orderId?: string }) => x?.orderId).filter(Boolean)
  : [];
for (const r of rows as { id: string; aanvraag_id: string; conversie_actie: ConversieActie; reden: string | null }[]) {
  if (!gelukt.includes(transactionId(r.aanvraag_id, r.conversie_actie))) continue;
  await db.query(`update montagebaas.ads_conversie_uploads set reden = $2 where id = $1`, [
    r.id,
    `ingetrokken ${nu} (RETRACTION)${r.reden ? `; eerder: ${r.reden}` : ""}`,
  ]);
  console.log(`  upload ${r.id}: als ingetrokken gemarkeerd`);
}
await db.end();
