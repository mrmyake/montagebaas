// Rendert de klantmails van echte testleads ("Test Keukenheld e2e …") opnieuw via dezelfde
// functies, met de rij uit de database, zonder te versturen. Toont afzender, reply-to,
// onderwerp en de regels met een bedrag.
// Gebruik: node scripts/controle-klantmails.mjs <created_at vanaf, ISO>
import { readFileSync } from "node:fs";
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
for (const l of readFileSync(root + ".env.local", "utf8").split("\n")) {
  if (!l || l.startsWith("#") || !l.includes("=")) continue;
  const i = l.indexOf("=");
  process.env[l.slice(0, i).trim()] ??= l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
process.env.MERK = "keukenheld"; process.env.LEAD_NOTIFY_TO = "";
const mails = [];
const echt = globalThis.fetch;
globalThis.fetch = async (u, init) => { if (String(u).includes("api.resend.com")) { mails.push(JSON.parse(init.body)); return new Response("{}"); } return echt(u, init); };
const jiti = createJiti(root, { alias: { "@": root + "src", "server-only": root + "scripts/leeg.mjs" } });
const n = await jiti.import(root + "src/lib/notify.ts");
const { supabaseAdmin } = await jiti.import(root + "src/lib/supabase.ts");
const { data } = await supabaseAdmin().from("aanvragen").select("*").like("naam", "Test Keukenheld e2e%").gte("created_at", process.argv[2]).order("created_at");
for (const a of data) {
  console.log(`## ${a.id} ${a.naam} | ${a.invoermethode} ${a.site_versie} ${a.merk} | getoond ${a.prijs_getoond_laag}–${a.prijs_getoond_hoog} | planner ${a.planner_status}`);
  if (a.invoermethode === "formulier") await n.stuurKlantBevestiging({ ...a, extras: a.extras ?? [] });
  if (a.invoermethode === "pdf") await n.stuurTekeningKlantBevestiging({ naam: a.naam, email: a.email, aanvraagId: a.id, prijs: { min: 2475, max: 3175, ruw: false } });
  if (a.invoermethode === "link") await n.stuurLinkKlantBevestiging({ naam: a.naam, email: a.email, plannerStatus: a.planner_status, aanvraagId: a.id });
  const m = mails.pop();
  console.log(`Van: ${m.from} | Antwoord aan: ${m.reply_to}\nOnderwerp: ${m.subject}\n${m.text.split("\n").filter((r) => /€|indicatie|Indicatie/.test(r)).join("\n") || "(geen bedrag)"}\n`);
}
