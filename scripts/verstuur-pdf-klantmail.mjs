// Verstuurt de klantmail van de PDF-route (stuurTekeningKlantBevestiging) lokaal
// voor één testlead en toont de mailtekst. Nodig omdat RESEND_* alleen op
// Production staan: op de preview gaan er geen mails uit.
//
// Weigert alles wat geen testlead is (naam met "test", e-mail me@ilja.com).
// Gebruik: node scripts/verstuur-pdf-klantmail.mjs <aanvraag-id>
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const root = fileURLToPath(new URL("../", import.meta.url));
for (const l of readFileSync(root + ".env.local", "utf8").split("\n")) {
  if (!l || l.startsWith("#") || !l.includes("=")) continue;
  const i = l.indexOf("=");
  process.env[l.slice(0, i).trim()] ??= l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const id = process.argv[2];
if (!id) throw new Error("Geef een aanvraag-id op");

// Mailtekst tonen vóór hij naar Resend gaat; daarna gewoon versturen.
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes("api.resend.com")) {
    const body = JSON.parse(init.body);
    console.log(`Aan: ${body.to.join(", ")}\nOnderwerp: ${body.subject}\n\n${body.text}\n`);
  }
  const res = await echteFetch(url, init);
  if (String(url).includes("api.resend.com")) console.log(`Resend: HTTP ${res.status}`);
  return res;
};

const jiti = createJiti(import.meta.url, { alias: { "@": root + "src", "server-only": root + "scripts/leeg.mjs" } });
const { supabaseAdmin } = await jiti.import(root + "src/lib/supabase.ts");
const { stuurTekeningKlantBevestiging } = await jiti.import(root + "src/lib/notify.ts");

const { data: a, error } = await supabaseAdmin().from("aanvragen").select("id, naam, email").eq("id", id).single();
if (error || !a) throw new Error(`Aanvraag ${id} niet gevonden`);
if (!/test/i.test(a.naam) || a.email.trim().toLowerCase() !== "me@ilja.com") {
  throw new Error(`Aanvraag ${id} ("${a.naam}") is geen testlead; niets verstuurd`);
}

// Zoals tekening-verwerker.ts hem aanroept; prijs = de AI-indicatie (hier geen,
// de test-PDF was geen keuken). Voor v2 moet de mail de band van het scherm tonen.
await stuurTekeningKlantBevestiging({ naam: a.naam, email: a.email, prijs: undefined, aanvraagId: a.id });
