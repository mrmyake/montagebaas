import { NextResponse, after } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { stuurNtfy } from "@/lib/ntfy";
import {
  stuurTekeningLeadNotificatie,
  stuurTekeningKlantBevestiging,
} from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { verwerkTekening } from "@/lib/tekening-verwerker";

/**
 * Upload-pad van /offerte: ontvangt een IKEA-tekening + minimale contactgegevens,
 * slaat het bestand op in de privé Storage-bucket `offerte-tekeningen`, schrijft
 * de lead naar dezelfde aanvragen-tabel (tekening_geupload=true) en notificeert.
 *
 * Bewust een route handler i.p.v. server-action: server-actions hebben een kleine
 * body-limiet, hier komt een bestand binnen.
 */

const BUCKET = "offerte-tekeningen";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per bestand — moet matchen met de bucket-limiet
const MAX_FILES = 8;
const EXT_VOOR_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

function fout(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  // Rate-limit per IP (best-effort) — zelfde bescherming als het formulier.
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "onbekend";
  if (!rateLimit(`upload:${ip}`, 5, 60_000).allowed) {
    return fout("Je hebt net al een aanvraag verstuurd. Wacht even of bel ons.", 429);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fout("Upload onleesbaar — probeer het formulier hieronder.", 400);
  }

  // Honeypot
  if ((form.get("website") as string | null)?.trim()) {
    return fout("Er ging iets mis. Probeer het opnieuw.", 400);
  }

  const naam = ((form.get("naam") as string | null) ?? "").trim();
  const email = ((form.get("email") as string | null) ?? "").trim();
  const telefoon = ((form.get("telefoon") as string | null) ?? "").trim();
  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);

  if (!naam || !telefoon || !/^\S+@\S+\.\S+$/.test(email)) {
    return fout("Vul je naam, telefoon en een geldig e-mailadres in.", 400);
  }
  if (files.length === 0) {
    return fout("Geen geldig bestand ontvangen.", 400);
  }
  if (files.length > MAX_FILES) {
    return fout(`Maximaal ${MAX_FILES} bestanden per keer.`, 400);
  }
  for (const f of files) {
    if (!EXT_VOOR_TYPE[f.type]) return fout(`Alleen PDF, PNG of JPG (${f.name}).`, 400);
    if (f.size > MAX_BYTES) return fout(`Bestand te groot, max 8 MB (${f.name}).`, 400);
  }

  const db = supabaseAdmin();

  // 1. Alle bestanden naar Storage
  const paden: string[] = [];
  for (const f of files) {
    const ext = EXT_VOOR_TYPE[f.type];
    const veiligeNaam = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || `tekening.${ext}`;
    const p = `aanvragen/${crypto.randomUUID()}-${veiligeNaam}`;
    const buffer = Buffer.from(await f.arrayBuffer());
    const up = await db.storage.from(BUCKET).upload(p, buffer, { contentType: f.type, upsert: false });
    if (up.error) {
      console.error("[upload] Storage mislukt:", up.error);
      return fout("Opslaan van je bestand(en) mislukte. Gebruik het formulier hieronder.", 500);
    }
    paden.push(p);
  }
  const tekeningPad = JSON.stringify(paden); // meerdere paden → JSON-array in tekening_pad
  const bestandsnamen = files.map((f) => f.name).join(", ");

  // 2. Lead wegschrijven (zelfde tabel)
  const { data, error } = await db
    .from("aanvragen")
    .insert({
      naam,
      telefoon,
      email,
      tekening_geupload: true,
      tekening_pad: tekeningPad,
      extras: [],
      status: "tekening_verwerken", // /bedankt pollt hierop tot de indicatie klaar is
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[upload] Insert mislukt:", error);
    return fout("Opslaan mislukte. Gebruik het formulier hieronder.", 500);
  }
  const id = data.id as string;

  // 3. Notificaties — best-effort, mogen de aanvraag niet laten falen.
  await Promise.allSettled([
    stuurNtfy({
      title: `Nieuwe aanvraag MET tekening: ${naam}`,
      body: `${naam}\nTel: ${telefoon}\nEmail: ${email}\nBestanden (${files.length}): ${bestandsnamen}`,
      tags: "house,paperclip",
      priority: "high",
    }),
    stuurTekeningLeadNotificatie({ id, naam, email, telefoon, bestandsnaam: bestandsnamen, pad: tekeningPad }),
    stuurTekeningKlantBevestiging({ naam, email }),
  ]);

  // Schakel 1 → 2: lezen + rekenen draait ONTKOPPELD ná de respons (Opus 4.8 kan
  // seconden duren). Upload-pad heeft geen postcode → regio null → landelijke tarieven.
  after(() => verwerkTekening(id, tekeningPad, null));

  return NextResponse.json({ ok: true, id });
}
