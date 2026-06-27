import { supabaseAdmin } from "@/lib/supabase";
import { leesTekening } from "@/lib/tekening-lezer";
import { laadTarieven } from "@/lib/tarieven";
import { berekenPrijsUitTelling } from "@/lib/rekenen";
import { stuurNtfy } from "@/lib/ntfy";
import { stuurTekeningKlantBevestiging } from "@/lib/notify";
import { euro } from "@/lib/pricing";

/**
 * Verwerkt een geüploade tekening NA de lead-capture (schakel 1 → schakel 2, §6).
 * Best-effort en ontkoppeld (draait via `after()` in de upload-route), dus dit mag
 * de upload-respons nooit blokkeren. `/bedankt` pollt de lead-status en toont de
 * indicatie zodra die er staat.
 *
 * Beleid (eigenaar koos: ALTIJD een indicatie, met marge + caveat):
 *  - validatie geslaagd + vertrouwen "hoog" → strakke range, status `prijs_berekend`.
 *  - validatie geslaagd + lager vertrouwen → range met opwaartse marge (kale plannen
 *    worden te láág geteld), afgerond op €50, status `prijs_indicatie`.
 *  - validatie faalt / leesfout → geen prijs, status `controle_tekening` (op /bedankt
 *    val je dan terug op "exacte prijs volgt binnen 24 uur").
 * In alle gevallen blijft het een INDICATIE; de vaste prijs bepaalt de eigenaar.
 */

// Kale/onzekere lezing telt structureel te laag → bovengrens omhoog hedgen.
const MARGE_LAAG_MAX = 1.3;
const rondAf = (incl: number, naar: number) => Math.round(incl / naar) * naar;

export async function verwerkTekening(
  aanvraagId: string,
  pad: string,
  regio: string | null,
  klant: { naam: string; email: string }
): Promise<void> {
  const db = supabaseAdmin();
  // Wordt gevuld als er een geldige lezing + prijs is; bepaalt of de klant-mail
  // een bedrag bevat.
  let prijsVoorKlant: { min: number; max: number; ruw: boolean } | undefined;

  try {
    const { validatie, ruw } = await leesTekening(pad);

    if (!validatie.ok) {
      await db.from("aanvragen").update({ status: "controle_tekening" }).eq("id", aanvraagId);
      console.warn(
        `[tekening] Validatie faalde (${aanvraagId}); ontbrekend: ${validatie.ontbrekend.join(", ")}`,
        ruw
      );
      await stuurNtfy({
        title: `Tekening: handmatige controle nodig`,
        body: `Lead ${aanvraagId}: telling onvolledig (${validatie.ontbrekend.join(", ")}). Geen indicatie getoond; beoordeel de tekening zelf.`,
        tags: "warning",
      });
    } else {
      const telling = validatie.telling;
      const hoog = telling.vertrouwen === "hoog";

      const { id: tarievenId, tarieven } = await laadTarieven(regio);
      const prijs = berekenPrijsUitTelling(telling, tarieven);

      const min = hoog
        ? Math.round(prijs.montageklaar.incl)
        : rondAf(prijs.montageklaar.incl, 50);
      const max = hoog
        ? Math.round(prijs.compleet.incl)
        : rondAf(prijs.compleet.incl * MARGE_LAAG_MAX, 50);

      await db
        .from("aanvragen")
        .update({
          prijs_indicatie_min: min, // montageklaar = ondergrens
          prijs_indicatie_max: max, // compleet (bij laag vertrouwen + marge) = bovengrens
          tarieven_id: tarievenId,
          status: hoog ? "prijs_berekend" : "prijs_indicatie",
        })
        .eq("id", aanvraagId);

      prijsVoorKlant = { min, max, ruw: !hoog };

      await stuurNtfy({
        title: hoog
          ? `Tekening: prijs berekend (hoog vertrouwen)`
          : `Tekening: indicatie (vertrouwen ${telling.vertrouwen})`,
        body: `Lead ${aanvraagId}\nIndicatie: ${euro(min)} – ${euro(max)}\nVertrouwen: ${telling.vertrouwen}\nAannames:\n- ${telling.aannames.join("\n- ")}\n${hoog ? "Controleer en stuur de exacte offerte." : "→ Klant is per mail gevraagd de IKEA-artikellijst te sturen voor een exacte prijs."}`,
        tags: hoog ? "house,heavy_check_mark" : "house,warning",
        priority: "high",
      });
    }
  } catch (err) {
    console.error(`[tekening] Verwerking mislukt (${aanvraagId}):`, err);
    try {
      await db.from("aanvragen").update({ status: "controle_tekening" }).eq("id", aanvraagId);
    } catch {
      // laatste redmiddel — niets meer te doen
    }
  }

  // Klant-mail ALTIJD versturen (best-effort), mét prijs+disclaimer indien bekend,
  // anders "exacte prijs volgt binnen 24 uur" zonder bedrag.
  await stuurTekeningKlantBevestiging({ naam: klant.naam, email: klant.email, prijs: prijsVoorKlant });
}
