import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { stuurNtfy } from "@/lib/ntfy";
import { parsePlannerLink } from "@/lib/ikea-planner/link";
import { verwerkPlannerLink } from "@/lib/ikea-planner/verwerker";
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
 */

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

  const id = await insertAanvraag(db, form, {
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
