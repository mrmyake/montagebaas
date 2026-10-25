"use server";

import { headers, cookies } from "next/headers";
import { after } from "next/server";
import { regioUitPostcode } from "@/lib/configurator";
import { supabaseAdmin } from "@/lib/supabase";
import { stuurLeadNotificatie, stuurKlantBevestiging } from "@/lib/notify";
import { stuurNtfy } from "@/lib/ntfy";
import { rateLimit } from "@/lib/rate-limit";
import { attributieVoorInsertMetConsent } from "@/lib/attributie";
import { consentVoorInsert, type ConsentBron, type ConsentState } from "@/lib/consent";
import { verstuurAdsConversieDirect } from "@/lib/ads-conversies-job";
import { extraOpties, naarKolommen, toonBedrag, vragenIndicatie, type ExtraKey } from "@/lib/prijs-weergave";
import { laadPrijsbron } from "@/lib/prijs-bron";
import {
  isGeldigeEmail,
  isGeldigeNaam,
  isGeldigePostcode,
  isGeldigeTelefoon,
  leesGrootte,
  leesKlus,
  leesOpstelling,
  leesPeriode,
  periodeLabel,
} from "@/lib/intake/velden";
import type { AanvraagInsert } from "@/lib/db.types";
import { huidigMerk } from "@/lib/merk";

/**
 * Vragenroute van de nieuwe intake (redesign). Zelfde bescherming en nasleep als
 * de oude configurator (src/app/offerte/actions.ts): honeypot, rate limit,
 * server-side validatie, attributie alleen met consent, ntfy, Ads-conversie bij
 * verzenden en twee mails. De indicatie wordt hier opnieuw berekend via de
 * prijsadapter, niet van de client overgenomen.
 */

export interface VragenPayload {
  klus: string;
  grootte: string;
  opstelling: string;
  extras: Partial<Record<ExtraKey, boolean>>;
  postcode: string;
  periode: string;
  naam: string;
  telefoon: string;
  email: string;
  toelichting?: string;
  website?: string; // honeypot
  consent?: ConsentState | null;
  consent_bron?: ConsentBron | null;
}

export type VragenResultaat = { ok: true; id: string } | { ok: false; error: string };

export async function verstuurVragenAanvraag(p: VragenPayload): Promise<VragenResultaat> {
  if (p.website && p.website.trim() !== "") {
    console.warn("[intake] Honeypot gevuld — als spam genegeerd.");
    return { ok: false, error: "Er ging iets mis. Probeer het opnieuw of bel ons." };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "onbekend";
  if (!rateLimit(`offerte:${ip}`, 5, 60_000).allowed) {
    return { ok: false, error: "Je hebt net al een aanvraag verstuurd. Wacht even of bel ons direct." };
  }

  const naam = p.naam?.trim() ?? "";
  const telefoon = p.telefoon?.trim() ?? "";
  const email = p.email?.trim() ?? "";
  if (!isGeldigeNaam(naam) || !isGeldigeTelefoon(telefoon) || !isGeldigeEmail(email)) {
    return { ok: false, error: "Vul je naam, telefoon en een geldig e-mailadres in." };
  }
  if (!isGeldigePostcode(p.postcode ?? "")) {
    return { ok: false, error: "Vul een geldige postcode in (bv. 1234 AB)." };
  }
  const klus = leesKlus(p.klus);
  const grootte = leesGrootte(p.grootte);
  const opstelling = leesOpstelling(p.opstelling);
  if (!klus || !grootte || !opstelling) {
    return { ok: false, error: "Er ontbreekt een keuze. Ga terug en kies je klus en keuken." };
  }
  const periode = leesPeriode(p.periode) ?? "weet_ik_nog_niet";

  // Mislukt het laden van de tarieven, dan zonder getoonde prijs: de lead gaat voor.
  const bron = await laadPrijsbron().catch((e) => {
    console.error("[intake] tarieven laden mislukt:", e);
    return null;
  });
  const opties = bron ? extraOpties(bron) : [];
  const extras = Object.fromEntries(opties.map((e) => [e.key, p.extras?.[e.key] === true])) as Record<ExtraKey, boolean>;
  const getoond = bron ? vragenIndicatie(bron, { klus, grootte, extras }).getoond : null;
  const kolommen = naarKolommen(getoond);
  const extrasLijst = opties.filter((e) => extras[e.key]).map((e) => e.label);
  const postcode = p.postcode.trim().toUpperCase();
  const regio = regioUitPostcode(postcode);
  const toelichting = p.toelichting?.trim().slice(0, 2000) || null;

  const insert: AanvraagInsert = {
    ...attributieVoorInsertMetConsent(await cookies(), p.consent),
    ...consentVoorInsert(p.consent, p.consent_bron),
    type_klus: klus,
    aantal_kasten_range: grootte,
    opstelling,
    extras: extrasLijst,
    // Zelfde band in beide kolommen: prijs_indicatie_* voedt mails en admin zoals voorheen.
    prijs_indicatie_min: kolommen.prijs_getoond_laag,
    prijs_indicatie_max: kolommen.prijs_getoond_hoog,
    ...kolommen,
    demontage_gekozen: extras.demontage,
    postcode,
    regio,
    naam,
    telefoon,
    email,
    gewenste_periode: periode,
    toelichting,
    invoermethode: "formulier",
    site_versie: "v2-redesign",
    merk: huidigMerk().id,
  };

  let id: string;
  try {
    const { data, error } = await supabaseAdmin().from("aanvragen").insert(insert).select("id").single();
    if (error || !data) {
      console.error("[intake] Supabase insert mislukt:", error);
      return { ok: false, error: "Er ging iets mis bij het opslaan. Probeer het opnieuw of bel ons." };
    }
    id = data.id as string;
  } catch (err) {
    console.error("[intake] Onverwachte fout:", err);
    return { ok: false, error: "Er ging iets mis. Probeer het opnieuw of neem telefonisch contact op." };
  }

  after(() =>
    stuurNtfy({
      title: `Nieuwe offerte: ${naam} - ${postcode}${regio ? ` (${regio})` : ""}`,
      body: [
        naam,
        `Tel: ${telefoon}`,
        `Email: ${email}`,
        `Postcode: ${postcode}${regio ? ` (${regio})` : ""}`,
        "",
        `Klus: ${klus}`,
        `Grootte: ${grootte} · ${opstelling}`,
        `Extra's: ${extrasLijst.length ? extrasLijst.join(", ") : "geen"}`,
        `Periode: ${periodeLabel(periode)}`,
        `Getoond: ${getoond ? toonBedrag(getoond) : "geen bedrag (prijs volgt)"} (nieuwe site)`,
        "",
        toelichting || "Geen toelichting",
      ].join("\n"),
      tags: "house,hammer",
      priority: "high",
    })
  );

  // Precies één keer per lead, bij verzenden.
  after(() => verstuurAdsConversieDirect(id));

  const leadData = {
    id,
    naam,
    telefoon,
    email,
    type_klus: klus,
    aantal_kasten_range: grootte,
    opstelling,
    extras: extrasLijst,
    prijs_indicatie_min: kolommen.prijs_getoond_laag ?? 0,
    prijs_indicatie_max: kolommen.prijs_getoond_hoog ?? 0,
    postcode,
    regio,
    gewenste_periode: periodeLabel(periode),
    toelichting,
  };
  after(() => Promise.allSettled([stuurLeadNotificatie(leadData), stuurKlantBevestiging(leadData)]));

  return { ok: true, id };
}
