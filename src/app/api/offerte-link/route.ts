import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { stuurNtfy } from "@/lib/ntfy";
import { parsePlannerLink } from "@/lib/ikea-planner/link";
import { TOON_PRIJS_BIJ_LINK, verwerkPlannerLink } from "@/lib/ikea-planner/verwerker";
import { werkbladUitTelling } from "@/lib/ikea-planner/klantweergave";
import { verstuurAdsConversieDirect } from "@/lib/ads-conversies-job";
import { leesIntakeVelden } from "@/lib/intake/server";
import { laadTarieven } from "@/lib/tarieven";
import { berekenPrijsUitTelling, valideerTelling } from "@/lib/rekenen";
import { linkGetoond, linkPrijzen, naarKolommen, prijsbronUitTarieven } from "@/lib/prijs-weergave";
import {
  bestandenUit,
  bewaarBestanden,
  binnenLimiet,
  honeypotGevuld,
  insertAanvraag,
  leesContact,
  valideerBestanden,
} from "@/lib/aanvraag-intake";

/**
 * Link-pad van /offerte: een gedeelde IKEA Keukenplanner-link + contact, en
 * optioneel bestanden (die worden opgeslagen en meegestuurd, maar alleen gelezen
 * als de link niet te lezen blijkt). Multipart, net als /api/offerte-upload.
 *
 * Het uitlezen van de link (~1 s, bij storing tot ~20 s) draait ná de respons
 * via after(); de lead staat dan al vast.
 *
 * Nieuwe intake (redesign): de link is dan al gelezen via /api/ontwerp-lezen. Die
 * snapshot wordt hier via lees_token aan de lead gekoppeld, en de prijs die de
 * klant zag wordt server-side opnieuw bepaald uit die snapshot (niet van de
 * client overgenomen). De Ads-conversie 'aanvraag_ontvangen' gaat bij
 * verzenden; de latere aanroep in verwerkPlannerLink is dan een no-op
 * (unique aanvraag_id + actie, en een vaste transactionId bij Google).
 */

/** Koppelt de snapshot van /api/ontwerp-lezen eenmalig aan de lead; geeft de telling terug. */
async function koppelSnapshot(
  db: ReturnType<typeof supabaseAdmin>,
  leesToken: string,
  uuid: string,
  aanvraagId: string
): Promise<unknown> {
  if (!/^[0-9a-f-]{36}$/i.test(leesToken)) return null;
  const { data, error } = await db
    .from("planner_snapshots")
    .update({ aanvraag_id: aanvraagId })
    .eq("lees_token", leesToken)
    .eq("ontwerp_uuid", uuid)
    .is("aanvraag_id", null)
    .select("telling")
    .maybeSingle();
  if (error) console.error(`[offerte-link] snapshot koppelen mislukt (${aanvraagId}):`, error.message);
  return data?.telling ?? null;
}

/** De vaste prijs die de klant zag, opnieuw uit de gekoppelde telling; null als er geen bedrag getoond werd. */
async function getoondePrijs(telling: unknown, pakket: "compleet" | "montageklaar" | undefined, demontage: boolean) {
  if (!TOON_PRIJS_BIJ_LINK || !pakket || !telling) return null;
  const v = valideerTelling(telling);
  if (!v.ok) return null;
  try {
    const { id, tarieven } = await laadTarieven(null);
    const werkblad = werkbladUitTelling(v.telling) ?? "geen";
    return linkGetoond(linkPrijzen(prijsbronUitTarieven(id, tarieven), berekenPrijsUitTelling(v.telling, tarieven), werkblad, true), pakket, demontage);
  } catch (e) {
    console.error("[offerte-link] getoonde prijs bepalen mislukt:", e);
    return null;
  }
}

function fout(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  if (!(await binnenLimiet("link"))) {
    return fout("Je hebt net al een aanvraag verstuurd. Wacht even of bel ons.", 429);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fout("Versturen mislukte — probeer het opnieuw of gebruik het formulier hieronder.", 400);
  }

  if (honeypotGevuld(form)) {
    return fout("Er ging iets mis. Probeer het opnieuw.", 400);
  }

  const contact = leesContact(form);
  if (!contact) {
    return fout("Vul je naam, telefoon en een geldig e-mailadres in.", 400);
  }

  const plannerUrl = ((form.get("planner_url") as string | null) ?? "").trim().slice(0, 2000);
  const link = parsePlannerLink(plannerUrl);
  if (!link.ok) {
    return fout(
      "Dit lijkt geen link naar een IKEA Keukenplanner-ontwerp. Kopieer de deellink opnieuw, of upload je PDF.",
      400
    );
  }

  const files = bestandenUit(form);
  const bestandFout = valideerBestanden(files);
  if (bestandFout) return fout(bestandFout, 400);

  const db = supabaseAdmin();
  const bewaard = files.length ? await bewaarBestanden(db, files) : null;
  if (files.length && !bewaard) {
    return fout("Opslaan van je bestand(en) mislukte. Probeer het zonder bestand, alleen met de link.", 500);
  }
  const { naam, email, telefoon } = contact;

  const intake = leesIntakeVelden(form);
  const id = await insertAanvraag(db, form, {
    ...intake,
    naam,
    telefoon,
    email,
    invoermethode: "link",
    tekening_geupload: !!bewaard,
    tekening_pad: bewaard?.tekeningPad ?? null,
    extras: [],
    status: "tekening_verwerken",
  });
  if (!id) {
    return fout("Opslaan mislukte. Probeer het opnieuw of bel ons.", 500);
  }

  const leesToken = ((form.get("lees_token") as string | null) ?? "").trim();
  if (leesToken) {
    const telling = await koppelSnapshot(db, leesToken, link.uuid, id);
    const getoond = await getoondePrijs(telling, intake.pakket_gekozen ?? undefined, intake.demontage_gekozen === true);
    if (getoond) {
      const { error } = await db.from("aanvragen").update(naarKolommen(getoond)).eq("id", id);
      if (error) console.error(`[offerte-link] prijs_getoond opslaan mislukt (${id}):`, error.message);
    }
  }

  // Precies één keer per lead, bij verzenden.
  after(() => verstuurAdsConversieDirect(id));

  after(() =>
    stuurNtfy({
      title: `Nieuwe aanvraag MET planner-link: ${naam}`,
      body: `${naam}\nTel: ${telefoon}\nEmail: ${email}\n${link.url}${bewaard ? `\nBestanden (${files.length}): ${bewaard.bestandsnamen}` : ""}`,
      tags: "house,link",
      priority: "high",
    })
  );

  after(() =>
    verwerkPlannerLink({
      aanvraagId: id,
      plannerUrl,
      genormaliseerdeUrl: link.url,
      uuid: link.uuid,
      klant: { naam, email, telefoon },
      bestanden: bewaard?.bestanden ?? [],
      tekeningPad: bewaard?.tekeningPad ?? null,
    })
  );

  return NextResponse.json({ ok: true, id });
}
