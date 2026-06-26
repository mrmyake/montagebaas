import { supabaseAdmin } from "@/lib/supabase";
import { leesTekening } from "@/lib/tekening-lezer";
import { laadTarieven } from "@/lib/tarieven";
import { berekenPrijsUitTelling } from "@/lib/rekenen";
import { stuurNtfy } from "@/lib/ntfy";
import { euro } from "@/lib/pricing";

/**
 * Verwerkt een geüploade tekening NA de lead-capture (schakel 1 → schakel 2, §6).
 * Best-effort en ontkoppeld (draait via `after()` in de upload-route), dus dit mag
 * de upload-respons nooit blokkeren.
 *
 * Routering op vertrouwen:
 *  - validatie geslaagd + vertrouwen "hoog" → prijs + tarieven_id naar de lead-rij
 *    (status `prijs_berekend`) voor de eigenaar-controle.
 *  - anders (lager vertrouwen of validatie faalt) → status `controle_tekening`,
 *    GEEN automatische prijs. De klant ziet sowieso nooit een prijs op dit pad.
 */
export async function verwerkTekening(
  aanvraagId: string,
  pad: string,
  regio: string | null
): Promise<void> {
  const db = supabaseAdmin();
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
        body: `Lead ${aanvraagId}: de telling was onvolledig (${validatie.ontbrekend.join(", ")}). Beoordeel de tekening zelf.`,
        tags: "warning",
      });
      return;
    }

    const telling = validatie.telling;

    if (telling.vertrouwen !== "hoog") {
      await db.from("aanvragen").update({ status: "controle_tekening" }).eq("id", aanvraagId);
      await stuurNtfy({
        title: `Tekening: controle nodig (vertrouwen ${telling.vertrouwen})`,
        body: `Lead ${aanvraagId}: gelezen, maar lager vertrouwen.\nAannames:\n- ${telling.aannames.join("\n- ")}`,
        tags: "warning",
      });
      return;
    }

    // Vertrouwen hoog → reken en schrijf de prijs voor de eigenaar-controle.
    const { id: tarievenId, tarieven } = await laadTarieven(regio);
    const prijs = berekenPrijsUitTelling(telling, tarieven);

    await db
      .from("aanvragen")
      .update({
        prijs_indicatie_min: prijs.montageklaar.incl, // montageklaar = ondergrens
        prijs_indicatie_max: prijs.compleet.incl, // compleet = bovengrens
        tarieven_id: tarievenId,
        status: "prijs_berekend",
      })
      .eq("id", aanvraagId);

    await stuurNtfy({
      title: `Tekening: prijs berekend (hoog vertrouwen)`,
      body: `Lead ${aanvraagId}\nMontageklaar: ${euro(prijs.montageklaar.incl)} · Compleet: ${euro(prijs.compleet.incl)}\nControleer en stuur de offerte.`,
      tags: "house,heavy_check_mark",
      priority: "high",
    });
  } catch (err) {
    console.error(`[tekening] Verwerking mislukt (${aanvraagId}):`, err);
    try {
      await db.from("aanvragen").update({ status: "controle_tekening" }).eq("id", aanvraagId);
    } catch {
      // laatste redmiddel — niets meer te doen
    }
  }
}
