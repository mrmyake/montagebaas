import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { TELVELDEN, valideerTelling, type ValidatieResultaat } from "@/lib/rekenen";

/**
 * Schakel 1 — tekening-lezer. Leest een IKEA-keukentekening (PDF/PNG/JPG) uit de
 * Storage-bucket en geeft UITSLUITEND een (gevalideerde) KeukenTelling terug.
 *
 * - Model: Claude Opus 4.8 (accuracy boven kosten in fase 1), via @ai-sdk/anthropic.
 * - Structured output: Zod-schema dat KeukenTelling 1-op-1 spiegelt (opgebouwd uit
 *   TELVELDEN, dus geen drift). `valideerTelling` (rekenen.ts) blijft de autoriteit.
 * - Tweesporenbeleid: itemlijst-pad (betrouwbaar) vs visuele interpretatie (gokwerk),
 *   weerspiegeld in `vertrouwen` + `aannames`.
 */

const BUCKET = "offerte-tekeningen";

// Zod-schema uit de bron (TELVELDEN), zodat het nooit afwijkt van KeukenTelling.
const telveldenShape = Object.fromEntries(
  TELVELDEN.map((veld) => [veld, z.number()])
) as Record<(typeof TELVELDEN)[number], z.ZodNumber>;

export const tellingSchema = z.object({
  ...telveldenShape,
  aannames: z.array(z.string()),
  vertrouwen: z.enum(["hoog", "gemiddeld", "laag"]),
});

export const LEZER_SYSTEM_PROMPT = `Je bent een nauwkeurige inspecteur die IKEA-keukentekeningen leest en UITSLUITEND telt.
Geef ALLEEN het gevraagde object terug (afgedwongen door het schema): geen proza, geen prijzen, geen minuten, geen uitleg, geen markdown.

WERKWIJZE — twee sporen:
1. Bepaal eerst of het bestand een ITEMLIJST bevat (IKEA-artikelnummers + aantallen, bv. "2x METOD onderkast 60x80").
2. ZO JA → tel de kasttypes en onderdelen op uit de itemlijst (primair, betrouwbaar). Zet "bron: itemlijst" in aannames en zet vertrouwen eerder op "hoog".
3. ZO NEE → interpreteer de visuele tekening (plaatjes, maatlijnen, genummerde kastjes). Zet "bron: visuele tekening" in aannames en zet vertrouwen op "gemiddeld" of "laag".

TELLEN:
- Vul elk van de 25 telvelden met een getal (de _meter-velden mogen 1 decimaal). 0 is toegestaan; laat NOOIT een veld weg.
- Ontbrekende of onleesbare info → veld op 0 én een regel in aannames die je aanname/twijfel beschrijft.
- vertrouwen = "laag" zodra een PRIJSBEPALEND veld onzeker is (onderkasten/bovenkasten/hoge kasten, werkblad_meter, eiland/afvoer). "hoog" alleen bij een eenduidig leesbaar plan (vooral met itemlijst).

VELD-UITLEG (kort):
onderkasten = lage kasten op de grond; bovenkasten = hangkasten; hoge_kasten = kolomkasten (oven/koelkast/voorraad); lade_elementen = lade-fronten/binnenlades; zijwanden = zichtbare zijpanelen; plint_meter = plint in meters; lichtlijst_meter = bovenste sierlijst in meters; werkblad_meter = werkblad-lengte in meters; uitsparing_spoelbak/uitsparing_kookplaat = uitsparingen in het werkblad; koppeling = werkblad-koppeling/verstek (aantal); spatwand_meter = achterwand in meters; spoelbak_kraan/vaatwasser/inductie/gaskookplaat/afzuigkap/oven/koelkast_vriezer/magnetron = apparaten (aantal); sloop = oude keuken slopen (1=ja, 0=nee); scheve_muren = correctie scheve muren (1=ja, 0=nee); kraanboring = extra kraangat (aantal); afvoer_leidingwerk = afvoer/leiding aanpassen (aantal punten); onderkast_verlichting = onderbouwverlichting (meters of stuks).`;

export interface LeesResultaat {
  validatie: ValidatieResultaat;
  ruw: unknown; // wat het model gaf — voor logging/debug
}

/**
 * Leest de al-geüploade tekening(en) en geeft de telling terug.
 * `tekening_pad` is óf één pad, óf een JSON-array van paden (multi-upload). Alle
 * bestanden gaan samen in één call zodat het model ze als ÉÉN keuken combineert.
 */
export async function leesTekening(tekeningPad: string): Promise<LeesResultaat> {
  const db = supabaseAdmin();

  let paden: string[];
  try {
    const parsed = JSON.parse(tekeningPad);
    paden = Array.isArray(parsed) ? parsed.map(String) : [tekeningPad];
  } catch {
    paden = [tekeningPad]; // backwards-compat: enkel pad
  }
  if (paden.length === 0) throw new Error("Geen tekening-paden in tekening_pad");

  const delen = await Promise.all(
    paden.map(async (p) => {
      const { data, error } = await db.storage.from(BUCKET).download(p);
      if (error || !data) {
        throw new Error(`Tekening niet gevonden in bucket (${p}): ${error?.message ?? "leeg"}`);
      }
      const mediaType = data.type || "application/pdf";
      const bytes = new Uint8Array(await data.arrayBuffer());
      return mediaType.startsWith("image/")
        ? ({ type: "image", image: bytes, mediaType } as const)
        : ({ type: "file", data: bytes, mediaType } as const);
    })
  );

  const instructie =
    paden.length > 1
      ? `Hieronder staan ${paden.length} bestanden (foto's/PDF's) van ÉÉN keuken. Combineer de informatie uit alle bestanden tot één telling.`
      : "Lees deze IKEA-keukentekening en vul de telling in volgens je instructies.";

  const { object } = await generateObject({
    model: anthropic("claude-opus-4-8"),
    schema: tellingSchema,
    system: LEZER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: [{ type: "text", text: instructie }, ...delen] }],
  });

  // valideerTelling is de autoriteit (Zod vormt alleen de output).
  return { validatie: valideerTelling(object), ruw: object };
}
