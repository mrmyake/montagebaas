"use server";

import { headers } from "next/headers";
import { berekenPrijs, type Extras, type Grootte, type Opstelling } from "@/lib/pricing";
import { isGeldigePostcode, regioUitPostcode, type TypeKlus } from "@/lib/configurator";
import { supabaseAdmin } from "@/lib/supabase";
import { stuurLeadNotificatie, stuurKlantBevestiging } from "@/lib/notify";
import { stuurNtfy } from "@/lib/ntfy";
import { rateLimit } from "@/lib/rate-limit";
import { euro } from "@/lib/pricing";
import type { AanvraagInsert } from "@/lib/db.types";

export interface AanvraagPayload {
  type_klus: TypeKlus;
  grootte: Grootte;
  opstelling: Opstelling;
  extras: Extras;
  postcode: string;
  naam: string;
  telefoon: string;
  email: string;
  gewenste_periode: string;
  toelichting?: string;
  website?: string; // honeypot — moet leeg zijn
}

export type AanvraagResultaat =
  | { ok: true; id: string }
  | { ok: false; error: string };

function extrasNaarLijst(extras: Extras): string[] {
  const lijst: string[] = [];
  if (extras.demontage_afvoer) lijst.push("Oude keuken demonteren + afvoeren");
  if (extras.apparaat_aansluiten)
    lijst.push(`Apparaten aansluiten (${Math.max(1, extras.apparaat_aantal ?? 1)}×)`);
  if (extras.werkblad_monteren) lijst.push("Werkblad monteren");
  if (extras.spoelbak_kraan) lijst.push("Spoelbak / kraan aansluiten");
  if (extras.lichte_leidingaanpassing) lijst.push("Lichte leidingaanpassing");
  return lijst;
}

export async function verstuurAanvraag(
  payload: AanvraagPayload
): Promise<AanvraagResultaat> {
  // Honeypot: alleen bots vullen dit verborgen veld. Stil afwijzen — niet opslaan,
  // niet notificeren, geen redirect/conversie. Echte bezoekers zien dit nooit.
  if (payload.website && payload.website.trim() !== "") {
    console.warn("[aanvraag] Honeypot gevuld — als spam genegeerd.");
    return { ok: false, error: "Er ging iets mis. Probeer het opnieuw of bel ons." };
  }

  // Rate-limit per IP (best-effort) — remt bot-bursts op betaald verkeer.
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "onbekend";
  const limit = rateLimit(`offerte:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return {
      ok: false,
      error: "Je hebt net al een aanvraag verstuurd. Wacht even of bel ons direct.",
    };
  }

  // Server-side validatie (vertrouw de client niet)
  const naam = payload.naam?.trim();
  const telefoon = payload.telefoon?.trim();
  const email = payload.email?.trim();

  if (!naam || !telefoon || !email) {
    return { ok: false, error: "Vul je naam, telefoon en e-mail in." };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: "Vul een geldig e-mailadres in." };
  }
  if (!isGeldigePostcode(payload.postcode)) {
    return { ok: false, error: "Vul een geldige postcode in (bv. 1234 AB)." };
  }

  // Prijs ALTIJD server-side herberekenen
  const range = berekenPrijs({
    grootte: payload.grootte,
    opstelling: payload.opstelling,
    extras: payload.extras,
  });

  const regio = regioUitPostcode(payload.postcode);
  const extrasLijst = extrasNaarLijst(payload.extras);

  const insert: AanvraagInsert = {
    type_klus: payload.type_klus,
    aantal_kasten_range: payload.grootte,
    opstelling: payload.opstelling,
    extras: extrasLijst,
    prijs_indicatie_min: range.min,
    prijs_indicatie_max: range.max,
    postcode: payload.postcode.trim().toUpperCase(),
    regio,
    naam,
    telefoon,
    email,
    gewenste_periode: payload.gewenste_periode,
    toelichting: payload.toelichting?.trim() || null,
  };

  let id: string;
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("aanvragen")
      .insert(insert)
      .select("id")
      .single();
    if (error || !data) {
      console.error("[aanvraag] Supabase insert mislukt:", error);
      return {
        ok: false,
        error: "Er ging iets mis bij het opslaan. Probeer het opnieuw of bel ons.",
      };
    }
    id = data.id as string;
  } catch (err) {
    console.error("[aanvraag] Onverwachte fout:", err);
    return {
      ok: false,
      error: "Er ging iets mis. Probeer het opnieuw of neem telefonisch contact op.",
    };
  }

  // Realtime push (ntfy) — owner ziet de lead meteen op z'n telefoon.
  // Best-effort, mag de aanvraag niet laten falen.
  const ntfyBody = [
    naam,
    `Tel: ${telefoon}`,
    `Email: ${email}`,
    `Postcode: ${insert.postcode}${regio ? ` (${regio})` : ""}`,
    "",
    `Klus: ${payload.type_klus}`,
    `Grootte: ${payload.grootte} · ${payload.opstelling}`,
    `Extra's: ${extrasLijst.length ? extrasLijst.join(", ") : "geen"}`,
    `Periode: ${payload.gewenste_periode}`,
    `Indicatie: ${euro(range.min)} – ${euro(range.max)}`,
    "",
    insert.toelichting || "Geen toelichting",
  ].join("\n");
  await stuurNtfy({
    title: `Nieuwe offerte: ${naam} - ${insert.postcode}${regio ? ` (${regio})` : ""}`,
    body: ntfyBody,
    tags: "house,hammer",
    priority: "high",
  });

  // Notificaties — best-effort, mogen de aanvraag niet laten falen.
  const leadData = {
    id,
    naam,
    telefoon,
    email,
    type_klus: payload.type_klus,
    aantal_kasten_range: payload.grootte,
    opstelling: payload.opstelling,
    extras: extrasLijst,
    prijs_indicatie_min: range.min,
    prijs_indicatie_max: range.max,
    postcode: insert.postcode,
    regio,
    gewenste_periode: payload.gewenste_periode,
    toelichting: insert.toelichting,
  };
  await Promise.allSettled([
    stuurLeadNotificatie(leadData), // interne notificatie naar de eigenaar
    stuurKlantBevestiging(leadData), // bevestiging naar de klant
  ]);

  return { ok: true, id };
}
