import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { stuurNtfy } from "@/lib/ntfy";
import { verwerkTekening } from "@/lib/tekening-verwerker";
import {
  bestandenUit,
  bewaarBestanden,
  binnenLimiet,
  honeypotGevuld,
  insertAanvraag,
  leesContact,
  methodeVoorBestanden,
  valideerBestanden,
} from "@/lib/aanvraag-intake";

/**
 * Upload-pad van /offerte: ontvangt een IKEA-tekening + minimale contactgegevens,
 * slaat het bestand op in de privé Storage-bucket `offerte-tekeningen`, schrijft
 * de lead naar dezelfde aanvragen-tabel (tekening_geupload=true) en notificeert.
 *
 * Bewust een route handler i.p.v. server-action: server-actions hebben een kleine
 * body-limiet, hier komt een bestand binnen. De gedeelde intake (validatie,
 * Storage, insert) staat in lib/aanvraag-intake.ts, ook gebruikt door de link-route.
 */

function fout(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  if (!(await binnenLimiet("upload"))) {
    return fout("Je hebt net al een aanvraag verstuurd. Wacht even of bel ons.", 429);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fout("Upload onleesbaar — probeer het formulier hieronder.", 400);
  }

  // Honeypot
  if (honeypotGevuld(form)) {
    return fout("Er ging iets mis. Probeer het opnieuw.", 400);
  }

  const contact = leesContact(form);
  const files = bestandenUit(form);

  if (!contact) {
    return fout("Vul je naam, telefoon en een geldig e-mailadres in.", 400);
  }
  if (files.length === 0) {
    return fout("Geen geldig bestand ontvangen.", 400);
  }
  const bestandFout = valideerBestanden(files);
  if (bestandFout) return fout(bestandFout, 400);

  const db = supabaseAdmin();

  // 1. Alle bestanden naar Storage (buffer bewaren we meteen voor de e-mailbijlage,
  // zodat we ze niet opnieuw hoeven te downloaden uit Storage)
  const bewaard = await bewaarBestanden(db, files);
  if (!bewaard) {
    return fout("Opslaan van je bestand(en) mislukte. Gebruik het formulier hieronder.", 500);
  }
  const { naam, email, telefoon } = contact;

  // 2. Lead wegschrijven (zelfde tabel).
  const id = await insertAanvraag(db, form, {
    naam,
    telefoon,
    email,
    tekening_geupload: true,
    tekening_pad: bewaard.tekeningPad,
    extras: [],
    invoermethode: methodeVoorBestanden(files),
    status: "tekening_verwerken", // /bedankt pollt hierop tot de indicatie klaar is
  });
  if (!id) {
    return fout("Opslaan mislukte. Gebruik het formulier hieronder.", 500);
  }

  // 3. Ntfy-push — instant mobiele melding, best-effort. De owner-mail (mét AI-resultaat
  // + bijlagen) volgt pas na schakel 2, zie hieronder.
  //
  // Bewust via after(): de lead staat hierboven al in de database, dus de bezoeker
  // mag niet wachten op een push die hem niet aangaat. Stond dit eerder wél in het
  // antwoordpad, dan bleef bij een trage ntfy.sh de redirect naar /bedankt uit —
  // aanvraag binnen, maar geen bevestiging voor de klant en geen conversie.
  after(() =>
    stuurNtfy({
      title: `Nieuwe aanvraag MET tekening: ${naam}`,
      body: `${naam}\nTel: ${telefoon}\nEmail: ${email}\nBestanden (${files.length}): ${bewaard.bestandsnamen}`,
      tags: "house,paperclip",
      priority: "high",
    })
  );

  // Schakel 1 → 2: lezen + rekenen draait ONTKOPPELD ná de respons (Opus 4.8 kan
  // seconden duren). De owner-mail (met AI-resultaat + bijlagen) en de klant-mail
  // (mét indicatie + disclaimer) gaan dáárna pas uit.
  // Upload-pad heeft geen postcode → regio null → landelijke tarieven.
  after(() =>
    verwerkTekening(id, bewaard.tekeningPad, null, { naam, email, telefoon }, bewaard.bestanden, {
      methode: methodeVoorBestanden(files),
    })
  );

  return NextResponse.json({ ok: true, id });
}
