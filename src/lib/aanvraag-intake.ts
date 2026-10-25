import { headers, cookies } from "next/headers";
import { attributieVoorInsertMetConsent } from "@/lib/attributie";
import { consentVoorInsert } from "@/lib/consent";
import { rateLimit } from "@/lib/rate-limit";
import type { supabaseAdmin } from "@/lib/supabase";
import type { AanvraagInsert } from "@/lib/db.types";
import { huidigMerk } from "@/lib/merk";

type Db = ReturnType<typeof supabaseAdmin>;

/**
 * Gedeelde intake van de twee multipart-ingangen op /offerte: de tekening-upload
 * (`/api/offerte-upload`) en de planner-link (`/api/offerte-link`). Validatie,
 * bestanden naar de privé bucket en de insert met attributie + consent.
 */

export const BUCKET = "offerte-tekeningen";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per bestand — moet matchen met de bucket-limiet
export const MAX_FILES = 8;
const EXT_VOOR_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

/** Rate-limit per IP (best-effort) — zelfde bescherming als het formulier. */
export async function binnenLimiet(sleutel: string): Promise<boolean> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "onbekend";
  return rateLimit(`${sleutel}:${ip}`, 5, 60_000).allowed;
}

export type Contact = { naam: string; email: string; telefoon: string };

export function leesContact(form: FormData): Contact | null {
  const naam = ((form.get("naam") as string | null) ?? "").trim();
  const email = ((form.get("email") as string | null) ?? "").trim();
  const telefoon = ((form.get("telefoon") as string | null) ?? "").trim();
  if (!naam || !telefoon || !/^\S+@\S+\.\S+$/.test(email)) return null;
  return { naam, email, telefoon };
}

export const honeypotGevuld = (form: FormData) => !!(form.get("website") as string | null)?.trim();

export const bestandenUit = (form: FormData) =>
  form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);

/** Geeft een foutmelding voor de klant terug, of null als alles past. */
export function valideerBestanden(files: File[]): string | null {
  if (files.length > MAX_FILES) return `Maximaal ${MAX_FILES} bestanden per keer.`;
  for (const f of files) {
    if (!EXT_VOOR_TYPE[f.type]) return `Alleen PDF, PNG of JPG (${f.name}).`;
    if (f.size > MAX_BYTES) return `Bestand te groot, max 8 MB (${f.name}).`;
  }
  return null;
}

/** pdf als er minstens één PDF bij zit, anders foto. */
export const methodeVoorBestanden = (files: File[]): "pdf" | "foto" =>
  files.some((f) => f.type === "application/pdf") ? "pdf" : "foto";

export interface BewaardeBestanden {
  tekeningPad: string; // JSON-array van paden (zo leest tekening-lezer.ts ze)
  bestanden: { naam: string; buffer: Buffer }[]; // buffers meteen bewaard voor de e-mailbijlage
  bestandsnamen: string;
}

/** Alle bestanden naar Storage. null = mislukt (al gelogd). */
export async function bewaarBestanden(db: Db, files: File[]): Promise<BewaardeBestanden | null> {
  const paden: string[] = [];
  const bestanden: { naam: string; buffer: Buffer }[] = [];
  for (const f of files) {
    const ext = EXT_VOOR_TYPE[f.type];
    const veiligeNaam = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || `tekening.${ext}`;
    const p = `aanvragen/${crypto.randomUUID()}-${veiligeNaam}`;
    const buffer = Buffer.from(await f.arrayBuffer());
    const up = await db.storage.from(BUCKET).upload(p, buffer, { contentType: f.type, upsert: false });
    if (up.error) {
      console.error("[upload] Storage mislukt:", up.error);
      return null;
    }
    paden.push(p);
    bestanden.push({ naam: f.name, buffer });
  }
  return { tekeningPad: JSON.stringify(paden), bestanden, bestandsnamen: files.map((f) => f.name).join(", ") };
}

/**
 * Lead wegschrijven. Attributie komt uit onze eigen cookie, die de browser
 * automatisch meestuurt, en telt alleen bij geaccepteerde banner — die keuze
 * zit wél in de FormData. Geeft het id terug, of null (al gelogd).
 */
export async function insertAanvraag(
  db: Db,
  form: FormData,
  velden: AanvraagInsert
): Promise<string | null> {
  const attributie = attributieVoorInsertMetConsent(await cookies(), form.get("consent"));
  const { data, error } = await db
    .from("aanvragen")
    .insert({
      ...attributie,
      ...consentVoorInsert(form.get("consent"), form.get("consent_bron")),
      merk: huidigMerk().id,
      ...velden,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[aanvraag] Insert mislukt:", error);
    return null;
  }
  return data.id as string;
}
