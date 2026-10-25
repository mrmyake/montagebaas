import { supabaseAdmin } from "@/lib/supabase";
import { leesTekening } from "@/lib/tekening-lezer";
import { laadTarieven } from "@/lib/tarieven";
import { berekenPrijsUitTelling, isLegeTelling } from "@/lib/rekenen";
import { stuurNtfy } from "@/lib/ntfy";
import {
  stuurTekeningIndicatieNotificatie,
  stuurTekeningKlantBevestiging,
  type PlannerNotitie,
} from "@/lib/notify";
import type { Invoermethode } from "@/lib/db.types";
import { euro } from "@/lib/pricing";
import { verstuurAdsConversieDirect } from "@/lib/ads-conversies-job";

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

// Resend limiteert een mail (incl. bijlagen) op 40 MB; base64 kost ~33% extra.
// Boven deze grens laten we de bijlage(n) weg (de mail toont dan het Storage-pad
// als fallback), zodat de mail zelf nooit faalt door een te grote bijlage.
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export async function verwerkTekening(
  aanvraagId: string,
  pad: string,
  regio: string | null,
  klant: { naam: string; email: string; telefoon: string },
  bestanden: { naam: string; buffer: Buffer }[],
  // Voor de owner-mail: de invoermethode, en bij een terugval vanuit de
  // planner-link de link + waarom die niet te lezen was.
  context: { methode?: Invoermethode; planner?: PlannerNotitie } = {}
): Promise<void> {
  const db = supabaseAdmin();
  // Wordt gevuld als er een geldige lezing + prijs is; bepaalt of de klant-mail
  // een bedrag bevat.
  let prijsVoorKlant: { min: number; max: number; ruw: boolean } | undefined;

  const bestandsnaam = bestanden.map((b) => b.naam).join(", ");
  const totaalBytes = bestanden.reduce((n, b) => n + b.buffer.byteLength, 0);
  const attachments =
    totaalBytes <= MAX_ATTACHMENT_BYTES
      ? bestanden.map((b) => ({ filename: b.naam, content: b.buffer.toString("base64") }))
      : undefined;

  try {
    const { validatie, ruw } = await leesTekening(pad);

    // Een lezing met alle telvelden op 0 is geen keuken: geen bedrag (anders
    // krijgt de klant alleen de voorrijkosten als "indicatie"), naar controle.
    const leeg = validatie.ok && isLegeTelling(validatie.telling);
    if (!validatie.ok || leeg) {
      const ontbrekend = validatie.ok ? ["alle telvelden zijn 0 (geen keuken herkend)"] : validatie.ontbrekend;
      await db.from("aanvragen").update({ status: "controle_tekening" }).eq("id", aanvraagId);
      console.warn(
        `[tekening] Validatie faalde (${aanvraagId}); ontbrekend: ${ontbrekend.join(", ")}`,
        ruw
      );
      await Promise.allSettled([
        stuurNtfy({
          title: `Tekening: handmatige controle nodig`,
          body: `Lead ${aanvraagId}: telling onvolledig (${ontbrekend.join(", ")}). Geen indicatie getoond; beoordeel de tekening zelf.`,
          tags: "warning",
        }),
        stuurTekeningIndicatieNotificatie({
          status: "controle",
          aanvraagId,
          naam: klant.naam,
          telefoon: klant.telefoon,
          email: klant.email,
          bestandsnaam,
          pad,
          attachments,
          ...context,
          ontbrekend,
        }),
      ]);
    } else if (validatie.ok) {
      const telling = validatie.telling;
      const hoog = telling.vertrouwen === "hoog";

      const { id: tarievenId, tarieven } = await laadTarieven(regio);
      const prijs = berekenPrijsUitTelling(telling, tarieven);
      // Losse posten (bv. sloop) staan niet in de pakketprijs; wel in de owner-notificatie.
      const aannames = [
        ...telling.aannames,
        ...prijs.toeslagen.map((t) => `Toeslag ${t.naam}: ${euro(t.incl)}, niet in de prijs hierboven`),
      ];

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

      // Upload-pad heeft pas nú een prijs_indicatie_max; dus pas nu de conversie
      // 'aanvraag_ontvangen' versturen (best-effort, cron vangt de rest).
      await verstuurAdsConversieDirect(aanvraagId);

      await Promise.allSettled([
        stuurNtfy({
          title: hoog
            ? `Tekening: prijs berekend (hoog vertrouwen)`
            : `Tekening: indicatie (vertrouwen ${telling.vertrouwen})`,
          body: `Lead ${aanvraagId}\nIndicatie: ${euro(min)} – ${euro(max)}\nVertrouwen: ${telling.vertrouwen}\nAannames:\n- ${aannames.join("\n- ")}\n${hoog ? "Controleer en stuur de exacte offerte." : "→ Klant is per mail gevraagd de IKEA-artikellijst te sturen voor een exacte prijs."}`,
          tags: hoog ? "house,heavy_check_mark" : "house,warning",
          priority: "high",
        }),
        stuurTekeningIndicatieNotificatie({
          status: hoog ? "berekend" : "indicatie",
          aanvraagId,
          naam: klant.naam,
          telefoon: klant.telefoon,
          email: klant.email,
          bestandsnaam,
          pad,
          attachments,
          ...context,
          min,
          max,
          vertrouwen: telling.vertrouwen,
          aannames,
        }),
      ]);
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
  await stuurTekeningKlantBevestiging({ naam: klant.naam, email: klant.email, prijs: prijsVoorKlant, aanvraagId });
}
