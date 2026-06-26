import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { stuurNtfy } from "@/lib/ntfy";
import {
  stuurTekeningLeadNotificatie,
  stuurTekeningKlantBevestiging,
} from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Upload-pad van /offerte: ontvangt een IKEA-tekening + minimale contactgegevens,
 * slaat het bestand op in de privé Storage-bucket `offerte-tekeningen`, schrijft
 * de lead naar dezelfde aanvragen-tabel (tekening_geupload=true) en notificeert.
 *
 * Bewust een route handler i.p.v. server-action: server-actions hebben een kleine
 * body-limiet, hier komt een bestand binnen.
 */

const BUCKET = "offerte-tekeningen";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — moet matchen met de bucket-limiet
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
  const file = form.get("file");

  if (!naam || !telefoon || !/^\S+@\S+\.\S+$/.test(email)) {
    return fout("Vul je naam, telefoon en een geldig e-mailadres in.", 400);
  }
  if (!(file instanceof File) || file.size === 0) {
    return fout("Geen geldig bestand ontvangen.", 400);
  }
  const ext = EXT_VOOR_TYPE[file.type];
  if (!ext) {
    return fout("Alleen PDF, PNG of JPG.", 400);
  }
  if (file.size > MAX_BYTES) {
    return fout("Bestand te groot (max 8 MB).", 400);
  }

  const db = supabaseAdmin();

  // 1. Bestand naar Storage
  const veiligeNaam = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || `tekening.${ext}`;
  const pad = `aanvragen/${crypto.randomUUID()}-${veiligeNaam}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const up = await db.storage
    .from(BUCKET)
    .upload(pad, buffer, { contentType: file.type, upsert: false });
  if (up.error) {
    console.error("[upload] Storage mislukt:", up.error);
    return fout("Opslaan van je tekening mislukte. Gebruik het formulier hieronder.", 500);
  }

  // 2. Lead wegschrijven (zelfde tabel)
  const { data, error } = await db
    .from("aanvragen")
    .insert({
      naam,
      telefoon,
      email,
      tekening_geupload: true,
      tekening_pad: pad,
      extras: [],
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
      body: `${naam}\nTel: ${telefoon}\nEmail: ${email}\nBestand: ${file.name}\nPad: ${BUCKET}/${pad}`,
      tags: "house,paperclip",
      priority: "high",
    }),
    stuurTekeningLeadNotificatie({ id, naam, email, telefoon, bestandsnaam: file.name, pad }),
    stuurTekeningKlantBevestiging({ naam, email }),
  ]);

  return NextResponse.json({ ok: true, id });
}
