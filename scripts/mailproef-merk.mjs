// Rendert de klantmails voor een merk en controleert dat de oude naam er niet in
// staat. Standaard gaat er niets naar Resend: de aanroep wordt onderschept.
//
// Gebruik:
//   MERK=keukenheld node scripts/mailproef-merk.mjs
//   MERK=keukenheld node scripts/mailproef-merk.mjs --verstuur   (echt, naar me@ilja.com)
//   MERK=keukenheld node scripts/mailproef-merk.mjs --verstuur --aan=<adres> --een
//     (alleen de formuliermail, naar een ander adres, bv. van mail-tester.com)
//
// --verstuur werkt pas als RESEND_API_KEY en RESEND_FROM_EMAIL in .env.local bij het
// merkdomein horen (tweede Resend-account voor dekeukenheld.nl).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const root = fileURLToPath(new URL("../", import.meta.url));
for (const l of readFileSync(root + ".env.local", "utf8").split("\n")) {
  if (!l || l.startsWith("#") || !l.includes("=")) continue;
  const i = l.indexOf("=");
  process.env[l.slice(0, i).trim()] ??= l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
const verstuur = process.argv.includes("--verstuur");
const aan = process.argv.find((a) => a.startsWith("--aan="))?.slice(6) || "me@ilja.com";
const een = process.argv.includes("--een");
// Zonder --verstuur: afzender uit de merkconfig, zoals op productie na de wissel.
if (!verstuur) delete process.env.RESEND_FROM_EMAIL;
process.env.RESEND_API_KEY ||= "proef";
process.env.LEAD_NOTIFY_TO = "me@ilja.com";

const mails = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (!String(url).includes("api.resend.com")) return echteFetch(url, init);
  const body = JSON.parse(init.body);
  mails.push(body);
  if (!verstuur) return new Response("{}", { status: 200 });
  const res = await echteFetch(url, init);
  console.log(`Resend: HTTP ${res.status} ${res.ok ? "" : await res.text()}`);
  return res;
};

const jiti = createJiti(import.meta.url, { alias: { "@": root + "src", "server-only": root + "scripts/leeg.mjs" } });
const notify = await jiti.import(root + "src/lib/notify.ts");
const { huidigMerk } = await jiti.import(root + "src/lib/merk/index.ts");

const klant = { naam: "Test Keukenheld", email: aan };
await notify.stuurKlantBevestiging({
  id: "00000000-0000-0000-0000-000000000000",
  ...klant,
  telefoon: "0600000000",
  type_klus: "complete_ikea_keuken",
  aantal_kasten_range: "8-15",
  opstelling: "hoek",
  extras: [],
  prijs_indicatie_min: 2475,
  prijs_indicatie_max: 3175,
  postcode: "1231 TX",
  regio: "Utrecht",
  gewenste_periode: "flexibel",
  toelichting: null,
});
if (!een) {
  await notify.stuurTekeningKlantBevestiging({ ...klant, prijs: { min: 2475, max: 3175, ruw: false } });
  await notify.stuurLinkKlantBevestiging({ ...klant, plannerStatus: "ok", prijs: { min: 2975, max: 2975 } });
  await notify.stuurLinkKlantBevestiging({ ...klant, plannerStatus: "verlopen" });
}

const merk = huidigMerk();
let fout = false;
for (const m of mails) {
  const alles = [m.from, m.subject, m.reply_to, m.text, m.html].join("\n");
  const oud = merk.id === "keukenheld" ? (alles.match(/.{0,40}montagebaas.{0,40}/gi) ?? []) : [];
  if (oud.length) fout = true;
  console.log(`--- Van: ${m.from}\nAan: ${m.to.join(", ")}\nAntwoord aan: ${m.reply_to}\nOnderwerp: ${m.subject}\n\n${m.text}\n`);
  console.log(oud.length ? `✗ oude naam gevonden: ${JSON.stringify(oud)}\n` : "✓ geen oude naam\n");
}
console.log(`${mails.length} klantmails gerenderd voor merk ${merk.id}${verstuur ? " en verstuurd" : " (niet verstuurd)"}.`);
process.exit(fout ? 1 : 0);
