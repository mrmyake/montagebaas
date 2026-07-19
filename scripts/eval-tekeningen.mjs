// Eval-run voor schakel 1: draait de lezer over een set echte plannen en rapporteert
// vertrouwen + bron (itemlijst/visueel) + kerntelling. GEEN ground-truth-vergelijking
// (we kennen de juiste telling niet) — dit meet de vertrouwens-verdeling: hoeveel
// plannen landen op het betrouwbare itemlijst-pad.
//
//   node --env-file=.env.local scripts/eval-tekeningen.mjs <plan1.pdf> <plan2.pdf> ...
//
// Spiegelt prompt/schema van src/lib/tekening-lezer.ts — houd in sync.
import { readFileSync, existsSync } from "node:fs";
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
  if (!mediaType) throw new Error("onbekend type");
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

const files = process.argv.slice(2);
const resultaten = [];
let idx = 0;
const LIMIT = 3;

async function worker() {
  while (idx < files.length) {
    const f = files[idx++];
    const naam = basename(f);
    if (!existsSync(f)) {
      resultaten.push({ naam, error: "bestaat niet" });
      console.log(`✗ ${naam}: bestaat niet`);
      continue;
    }
    try {
      const t = await lees(f);
      const bron = t.aannames.join(" ").toLowerCase().includes("itemlijst") ? "itemlijst" : "visueel";
      resultaten.push({ naam, vertrouwen: t.vertrouwen, bron, t });
      console.log(
        `• ${naam}\n   vertrouwen=${t.vertrouwen} · bron=${bron} · ` +
          `onder=${t.onderkasten} boven=${t.bovenkasten} hoog=${t.hoge_kasten} lades=${t.lade_elementen} werkblad=${t.werkblad_meter}m`
      );
    } catch (e) {
      resultaten.push({ naam, error: e.message });
      console.log(`✗ ${naam}: ${e.message}`);
    }
  }
}

await Promise.all(Array.from({ length: LIMIT }, worker));

const ok = resultaten.filter((r) => !r.error);
const tel = (v) => ok.filter((r) => r.vertrouwen === v).length;
const itemlijst = ok.filter((r) => r.bron === "itemlijst").length;
console.log("\n==================== SAMENVATTING ====================");
console.log(`Gelezen: ${ok.length}/${files.length} (${resultaten.length - ok.length} fout)`);
console.log(`Bron itemlijst: ${itemlijst} · visueel: ${ok.length - itemlijst}`);
console.log(`Vertrouwen — hoog: ${tel("hoog")} · gemiddeld: ${tel("gemiddeld")} · laag: ${tel("laag")}`);
console.log(`→ ${ok.length ? Math.round((tel("hoog") / ok.length) * 100) : 0}% zou meteen een hoog-vertrouwen prijs krijgen.`);
