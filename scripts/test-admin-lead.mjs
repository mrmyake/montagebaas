// Diagnose/rooktest voor het leadformulier in /admin/leads: roept de server action
// updateLead aan zoals de browser dat doet, zonder browser.
//
//   ADMIN_USER=… ADMIN_PASSWORD=… node scripts/test-admin-lead.mjs <baseUrl> <aanvraagId> <lead_status> \
//     [offerte_bedrag] [gefactureerd_bedrag] [reden_verloren] [notitie]
//
//   bv. node --env-file=.env.local scripts/test-admin-lead.mjs http://localhost:3000 <id> contact_gelegd
//
// Gebruik alleen een testlead ("Ilja Test") en zet hem daarna terug naar 'nieuw'.
//
// Twee valkuilen die dit script afvangt:
// - De action-ID verschilt per build; hij wordt uit de client-chunks van de pagina
//   gehaald. Een verouderde ID geeft een 404 ("Server action not found").
// - React's encodeReply zet het root-veld "0" als LAATSTE; de server leest de body
//   gestreamd en ziet velden ná "0" niet (→ lege FormData → "Ongeldige status.").
//   Velden van het FormData-argument krijgen het prefix "_1_".

const [baseUrl, aanvraagId, status, offerte = "", factuur = "", reden = "", notitie = ""] = process.argv.slice(2);
if (!baseUrl || !aanvraagId || !status) {
  console.error("Gebruik: node scripts/test-admin-lead.mjs <baseUrl> <aanvraagId> <lead_status> [offerte] [factuur] [reden] [notitie]");
  process.exit(1);
}

const auth = "Basic " + Buffer.from(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASSWORD}`).toString("base64");

const pagina = await fetch(`${baseUrl}/admin/leads`, { headers: { authorization: auth } });
console.log(`GET /admin/leads → ${pagina.status}`);
if (!pagina.ok) process.exit(1);
const html = await pagina.text();

let actionId;
for (const chunk of new Set(html.match(/\/_next\/static\/chunks\/[^"']+\.js/g) ?? [])) {
  const js = await (await fetch(baseUrl + chunk)).text();
  const m = js.match(/"([0-9a-f]{40,})"[^"]{0,200}"updateLead"/) ?? js.match(/"updateLead"[^"]{0,200}"([0-9a-f]{40,})"/);
  if (m) { actionId = m[1]; break; }
}
if (!actionId) {
  console.error("Kon de action-ID van updateLead niet vinden in de client-chunks.");
  process.exit(1);
}
console.log(`action-ID: ${actionId}`);

const body = new FormData();
body.append("_1_lead_status", status);
body.append("_1_offerte_bedrag", offerte);
body.append("_1_gefactureerd_bedrag", factuur);
body.append("_1_reden_verloren", reden);
body.append("_1_notitie", notitie);
body.append("0", JSON.stringify([aanvraagId, {}, "$K1"]));

const res = await fetch(`${baseUrl}/admin/leads`, {
  method: "POST",
  headers: { authorization: auth, "next-action": actionId, accept: "text/x-component" },
  body,
});
const tekst = await res.text();
const fout = tekst.match(/\{"error":"[^"]*"\}/)?.[0];
console.log(`POST updateLead → ${res.status}${fout ? ` ${fout}` : ""}`);
process.exit(res.ok && !fout ? 0 : 1);
