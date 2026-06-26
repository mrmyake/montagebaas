// B5 — leestest voor schakel 1 (tekening-lezer). Meet de LEESNAUWKEURIGHEID,
// los van de rekentest (die is al groen). Draai met je eigen IKEA-plannen:
//
//   node --env-file=.env.local scripts/leestest-tekening.mjs <plan1.pdf> [plan2.pdf ...]
//
// Tip (testset-eis): lever per keuken twee exports — één MÉT itemlijst en één
// als kale tekening — zodat je ziet hoeveel betrouwbaarder het itemlijst-pad is.
//
// Vereist: ANTHROPIC_API_KEY in .env.local. Het prompt/schema spiegelt
// src/lib/tekening-lezer.ts — houd ze in sync als je daar de prompt wijzigt.
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const TELVELDEN = [
  "onderkasten", "bovenkasten", "hoge_kasten", "lade_elementen", "zijwanden",
  "plint_meter", "lichtlijst_meter", "werkblad_meter", "uitsparing_spoelbak",
  "uitsparing_kookplaat", "koppeling", "spatwand_meter", "spoelbak_kraan",
  "vaatwasser", "inductie", "gaskookplaat", "afzuigkap", "oven",
  "koelkast_vriezer", "magnetron", "sloop", "scheve_muren", "kraanboring",
  "afvoer_leidingwerk", "onderkast_verlichting",
];

// Bekende juiste telling van de ontwerp-keuken (§B5).
const VERWACHT = {
  onderkasten: 12, bovenkasten: 0, hoge_kasten: 3, lade_elementen: 6, zijwanden: 6,
  plint_meter: 9, lichtlijst_meter: 0, werkblad_meter: 6.4, uitsparing_spoelbak: 1,
  uitsparing_kookplaat: 1, koppeling: 1, spatwand_meter: 0, spoelbak_kraan: 1, vaatwasser: 1,
  inductie: 1, gaskookplaat: 0, afzuigkap: 1, oven: 1, koelkast_vriezer: 2, magnetron: 1,
  sloop: 0, scheve_muren: 0, kraanboring: 0, afvoer_leidingwerk: 2, onderkast_verlichting: 0,
};

const SYSTEM_PROMPT = `Je bent een nauwkeurige inspecteur die IKEA-keukentekeningen leest en UITSLUITEND telt.
Geef ALLEEN het gevraagde object terug (afgedwongen door het schema): geen proza, geen prijzen, geen minuten, geen uitleg, geen markdown.
Bepaal eerst of er een ITEMLIJST is (artikelnummers + aantallen). Zo ja: tel uit de itemlijst (betrouwbaar, "bron: itemlijst" in aannames, vertrouwen eerder "hoog"). Zo nee: interpreteer de visuele tekening ("bron: visuele tekening", vertrouwen "gemiddeld"/"laag").
Vul elk van de 25 telvelden met een getal (de _meter-velden mogen 1 decimaal). 0 is toegestaan; laat geen veld weg. Ontbrekend/onleesbaar → 0 + een regel in aannames. vertrouwen "laag" zodra een prijsbepalend veld (onderkasten/bovenkasten/hoge kasten, werkblad_meter, eiland/afvoer) onzeker is.`;

const schema = z.object({
  ...Object.fromEntries(TELVELDEN.map((v) => [v, z.number()])),
  aannames: z.array(z.string()),
  vertrouwen: z.enum(["hoog", "gemiddeld", "laag"]),
});

const MIME = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

async function lees(pad) {
  const mediaType = MIME[extname(pad).toLowerCase()];
  if (!mediaType) throw new Error(`Onbekend bestandstype: ${pad}`);
  const bytes = new Uint8Array(readFileSync(pad));
  const deel = mediaType.startsWith("image/")
    ? { type: "image", image: bytes, mediaType }
    : { type: "file", data: bytes, mediaType };
  const { object } = await generateObject({
    model: anthropic("claude-opus-4-8"),
    schema,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: [{ type: "text", text: "Lees deze IKEA-keukentekening en vul de telling in." }, deel] }],
  });
  return object;
}

const bestanden = process.argv.slice(2);
if (!bestanden.length) {
  console.error("Geef minstens één tekening-bestand op.");
  process.exit(1);
}

for (const pad of bestanden) {
  console.log(`\n=== ${basename(pad)} ===`);
  try {
    const t = await lees(pad);
    let goed = 0;
    for (const veld of TELVELDEN) {
      const ok = t[veld] === VERWACHT[veld];
      if (ok) goed++;
      else console.log(`  ✗ ${veld}: gelezen ${t[veld]} — verwacht ${VERWACHT[veld]}`);
    }
    console.log(`  → ${goed}/25 velden correct · vertrouwen=${t.vertrouwen}`);
    console.log(`  → aannames: ${t.aannames.join(" | ") || "(geen)"}`);
  } catch (err) {
    console.error(`  FOUT: ${err.message}`);
  }
}
