/**
 * Offline conversies terug naar Google Ads (enhanced conversions for leads via
 * de Data Manager API, `events:ingest`).
 *
 * Dit bestand bevat ALLEEN pure functies: normaliseren, hashen, beslissen of
 * een rij meegaat, en het bouwen van de request-body. Geen Supabase, geen
 * netwerk, geen env — zodat alles testbaar is met `npm test`. De orkestratie
 * (view lezen, API aanroepen, resultaat wegschrijven) staat in
 * ads-conversies-job.ts; de HTTP-ingang in app/api/cron/ads-conversies.
 *
 * Veldnamen zijn geverifieerd tegen het discovery-document van de API
 * (https://datamanager.googleapis.com/$discovery/rest?version=v1) op 23-10-2026.
 */
import { createHash } from "node:crypto";

export type ConversieActie = "aanvraag_ontvangen" | "offerte_verstuurd" | "opdracht_gewonnen";
export const CONVERSIE_ACTIES: ConversieActie[] = [
  "aanvraag_ontvangen", // elke website-aanvraag bij binnenkomst, vaste waarde (ADS_LEAD_WAARDE)
  "offerte_verstuurd",
  "opdracht_gewonnen",
];

/**
 * Vaste waarde van een binnengekomen aanvraag (aanvraag_ontvangen), voor alle
 * leads gelijk, ongeacht invoermethode of prijsindicatie. Overschrijfbaar met
 * ADS_LEAD_WAARDE (zie ads-conversies-job.ts). Zo eindigt geen lead meer als
 * 'overgeslagen' omdat er (nog) geen prijs is, en stuurt een ongekalibreerde
 * indicatie de biedstrategie niet.
 */
export const ADS_LEAD_WAARDE_STANDAARD = 2250;

/** Maximale leeftijd van een klik op het moment van de conversie. */
export const MAX_KLIK_LEEFTIJD_DAGEN = 90;

/**
 * Moment waarop de consentkeuze per aanvraag live ging (0007 op montagebaas.com).
 * Aanvragen van daarvóór hebben structureel NULL in de consentkolommen: er was
 * nog niets om vast te leggen. Die gaan bij de backfill mee met
 * CONSENT_STATUS_UNSPECIFIED. Aanvragen van daarna met NULL volgen het beleid
 * ADS_CONSENT_ONBEKEND (in productie: overslaan).
 */
export const CONSENT_CAPTURE_LIVEGANG = "2026-10-23T00:00:00+02:00";

/** Spiegelt montagebaas.ads_conversies_te_versturen (0007 t/m 0011). */
export interface TeVersturenRij {
  aanvraag_id: string;
  conversie_actie: ConversieActie;
  event_tijdstip: string;
  /** 'migratie' = tijdstip komt uit de statusimport van 25-09-2026 en is niet echt. */
  tijdstip_bron: "log" | "fallback" | "migratie";
  waarde: number | string | null;
  created_at: string;
  lead_status: string;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  email: string | null;
  telefoon: string | null;
  consent_ad_user_data: boolean | null;
  consent_ad_personalization: boolean | null;
  upload_status: "wachtend" | "fout" | null;
  consent_bron: "banner" | "formulier" | null;
  /** Alleen bij aanvraag_ontvangen: id van een eerdere aanvraag (≤ 7 dagen) met hetzelfde e-mailadres of telefoonnummer (0011). */
  duplicaat_van: string | null;
}

/**
 * Eigen contactgegevens (testinzendingen). Komen uit ADS_UITGESLOTEN_CONTACTEN,
 * genormaliseerd met normaliseerEmail/normaliseerTelefoon; zie
 * parseUitgeslotenContacten. Een aanvraag die op e-mail óf telefoon matcht, gaat
 * nooit naar Google.
 */
export interface UitgeslotenContacten {
  emails: Set<string>;
  telefoons: Set<string>;
}

/** "me@x.nl, 06-12345678" → genormaliseerde sets. Onbruikbare items worden stil genegeerd. */
export function parseUitgeslotenContacten(raw: string | undefined | null): UitgeslotenContacten {
  const uit: UitgeslotenContacten = { emails: new Set(), telefoons: new Set() };
  for (const item of (raw ?? "").split(",")) {
    const s = item.trim();
    if (!s) continue;
    if (s.includes("@")) {
      const e = normaliseerEmail(s);
      if (e) uit.emails.add(e);
    } else {
      const t = normaliseerTelefoon(s);
      if (t) uit.telefoons.add(t);
    }
  }
  return uit;
}

/**
 * Beleid voor rijen zonder vastgelegde consent (NULL in de database) die zijn
 * binnengekomen ná CONSENT_CAPTURE_LIVEGANG. Oudere rijen gaan altijd mee met
 * CONSENT_STATUS_UNSPECIFIED (zie beslis):
 *  - "wachten":      niet versturen, rij blijft in de werkvoorraad (standaard
 *                    zolang er geen beslissing is genomen);
 *  - "overslaan":    niet versturen, definitief markeren als overgeslagen;
 *  - "unspecified":  versturen met CONSENT_STATUS_UNSPECIFIED.
 */
export type ConsentOnbekendBeleid = "wachten" | "overslaan" | "unspecified";

export type ConsentStatus = "CONSENT_STATUS_UNSPECIFIED" | "CONSENT_GRANTED" | "CONSENT_DENIED";

export interface AdsConsent {
  adUserData: ConsentStatus;
  adPersonalization: ConsentStatus;
}

export type KlikIdType = "gclid" | "gbraid" | "wbraid";

export interface AdsEvent {
  transactionId: string;
  eventTimestamp: string;
  eventSource: "WEB";
  conversionValue: number;
  currency: "EUR";
  adIdentifiers?: Partial<Record<KlikIdType, string>>;
  userData?: { userIdentifiers: ({ emailAddress: string } | { phoneNumber: string })[] };
  consent: AdsConsent;
}

export type Beslissing =
  | { soort: "versturen"; event: AdsEvent; klikType: KlikIdType | null }
  | { soort: "overslaan"; reden: string; klikType: KlikIdType | null }
  | { soort: "wachten"; reden: string; klikType: KlikIdType | null };

// ---------------------------------------------------------------------------
// Normaliseren en hashen
// ---------------------------------------------------------------------------

/**
 * E-mail volgens de Data Manager-formatteringsregels: alle whitespace weg,
 * lowercase; bij gmail.com/googlemail.com ook de punten en een eventueel
 * '+label' uit het lokale deel. Ongeldig → null (dan geen identifier).
 */
export function normaliseerEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.replace(/\s+/g, "").toLowerCase();
  const at = s.lastIndexOf("@");
  if (at <= 0 || at === s.length - 1) return null;
  let lokaal = s.slice(0, at);
  const domein = s.slice(at + 1);
  if (!domein.includes(".")) return null;
  if (domein === "gmail.com" || domein === "googlemail.com") {
    lokaal = lokaal.replace(/\./g, "");
    const plus = lokaal.indexOf("+");
    if (plus > 0) lokaal = lokaal.slice(0, plus);
  }
  if (!lokaal) return null;
  return `${lokaal}@${domein}`;
}

/**
 * Telefoon naar E.164. Nederlands als standaard: `06…` en `0031…` → `+316…`;
 * `+31…` blijft; een nummer dat met `00` begint krijgt een `+`. Alles wat na
 * opschonen niet op `+<8..15 cijfers>` lijkt, is ongeldig → null (bewust geen
 * fout: een ontbrekende identifier is beter dan een geweigerde batch).
 */
export function normaliseerTelefoon(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // "(0)" is de Nederlandse schrijfwijze voor "laat de 0 weg bij internationaal
  // bellen" — eerst verwijderen, anders blijft die 0 in het nummer hangen.
  let s = raw.trim().replace(/\(0\)/g, "").replace(/[\s\-().\u00a0]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  else if (s.startsWith("0")) s = `+31${s.slice(1)}`;
  else if (/^31\d{9}$/.test(s)) s = `+${s}`;
  else if (/^\d+$/.test(s)) s = `+${s}`;
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null;
  return s;
}

export function sha256Hex(waarde: string): string {
  return createHash("sha256").update(waarde, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Beslissen en bouwen
// ---------------------------------------------------------------------------

export function kiesKlikId(rij: Pick<TeVersturenRij, "gclid" | "gbraid" | "wbraid">): {
  type: KlikIdType;
  waarde: string;
} | null {
  // Precies één, met voorrang gclid. In de praktijk komen gclid en gbraid
  // soms samen voor (iOS); dan wint gclid.
  if (rij.gclid) return { type: "gclid", waarde: rij.gclid };
  if (rij.gbraid) return { type: "gbraid", waarde: rij.gbraid };
  if (rij.wbraid) return { type: "wbraid", waarde: rij.wbraid };
  return null;
}

export function transactionId(aanvraagId: string, actie: ConversieActie): string {
  return `${aanvraagId}:${actie}`;
}

function naarConsentStatus(v: boolean | null): ConsentStatus {
  if (v === true) return "CONSENT_GRANTED";
  if (v === false) return "CONSENT_DENIED";
  return "CONSENT_STATUS_UNSPECIFIED";
}

function dagenTussen(vroeg: string, laat: string): number {
  return (new Date(laat).getTime() - new Date(vroeg).getTime()) / 86_400_000;
}

/**
 * Beslist per rij uit de view: versturen, definitief overslaan (met reden), of
 * wachten (consent onbekend zonder beleid). Bouwt bij 'versturen' meteen het
 * event met gehashte identifiers.
 */
export function beslis(
  rij: TeVersturenRij,
  opties: {
    consentOnbekend: ConsentOnbekendBeleid;
    consentLivegang?: string;
    uitgesloten?: UitgeslotenContacten;
    /** Waarde voor aanvraag_ontvangen; standaard ADS_LEAD_WAARDE_STANDAARD. */
    leadWaarde?: number;
    nu?: Date;
  }
): Beslissing {
  const klik = kiesKlikId(rij);
  const klikType = klik?.type ?? null;

  const email = normaliseerEmail(rij.email);
  const telefoon = normaliseerTelefoon(rij.telefoon);

  // Eigen testinzendingen: nooit versturen, welke actie ook.
  if (
    opties.uitgesloten &&
    ((email && opties.uitgesloten.emails.has(email)) ||
      (telefoon && opties.uitgesloten.telefoons.has(telefoon)))
  ) {
    return { soort: "overslaan", reden: "testinzending (eigen contactgegevens)", klikType };
  }

  // Statusimport van 25-09: het logtijdstip is het importmoment, niet het echte
  // conversiemoment. Niets definitiefs beslissen (ook niet over waarde of
  // klikleeftijd) tot de datum in lead_status_log is gecorrigeerd — dan wordt
  // tijdstip_bron weer 'log' en gaat de rij vanzelf mee.
  if (rij.tijdstip_bron === "migratie") {
    return {
      soort: "wachten",
      reden: "event-tijdstip komt uit de statusimport van 25-09; datum nog corrigeren",
      klikType,
    };
  }

  // Dubbele aanvraag (zelfde contact binnen 7 dagen): alleen de eerste telt.
  if (rij.duplicaat_van) {
    return { soort: "overslaan", reden: `duplicaat van ${rij.duplicaat_van.slice(0, 8)}`, klikType };
  }

  // aanvraag_ontvangen: altijd de vaste leadwaarde; de view levert daar geen waarde.
  // offerte_verstuurd/opdracht_gewonnen: het echte bedrag uit de view.
  const waarde =
    rij.conversie_actie === "aanvraag_ontvangen"
      ? (opties.leadWaarde ?? ADS_LEAD_WAARDE_STANDAARD)
      : rij.waarde === null || rij.waarde === undefined
        ? NaN
        : Number(rij.waarde);
  if (!Number.isFinite(waarde) || waarde <= 0) {
    return { soort: "overslaan", reden: "waarde ontbreekt of is 0", klikType };
  }

  if (!klik && !email && !telefoon) {
    return { soort: "overslaan", reden: "geen click-ID en geen bruikbare e-mail/telefoon", klikType };
  }

  if (klik && dagenTussen(rij.created_at, rij.event_tijdstip) > MAX_KLIK_LEEFTIJD_DAGEN) {
    return {
      soort: "overslaan",
      reden: `klik ouder dan ${MAX_KLIK_LEEFTIJD_DAGEN} dagen op het conversiemoment`,
      klikType,
    };
  }

  // Geweigerd = niet versturen. De bezoeker heeft nee gezegd tegen het delen
  // van gegevens met Google voor advertentiemeting; dan sturen we ook geen
  // klik-ID of gehashte contactgegevens na. (Google verwerkt EER-conversies
  // zonder CONSENT_GRANTED op adUserData sowieso niet.) De bannertekst belooft dit.
  if (rij.consent_ad_user_data === false || rij.consent_ad_personalization === false) {
    return { soort: "overslaan", reden: "consent geweigerd", klikType };
  }

  const consentOnbekend = rij.consent_ad_user_data === null || rij.consent_ad_personalization === null;
  const historisch =
    new Date(rij.created_at).getTime() <
    new Date(opties.consentLivegang ?? CONSENT_CAPTURE_LIVEGANG).getTime();
  // Historische rij (van vóór consent-capture): er was niets om vast te leggen,
  // dus mee met CONSENT_STATUS_UNSPECIFIED. Alleen nieuwe rijen volgen het beleid.
  if (consentOnbekend && !historisch) {
    if (opties.consentOnbekend === "wachten") {
      return { soort: "wachten", reden: "consent onbekend; beleid nog niet vastgesteld", klikType };
    }
    if (opties.consentOnbekend === "overslaan") {
      return { soort: "overslaan", reden: "consent onbekend", klikType };
    }
  }

  const userIdentifiers: ({ emailAddress: string } | { phoneNumber: string })[] = [];
  if (email) userIdentifiers.push({ emailAddress: sha256Hex(email) });
  if (telefoon) userIdentifiers.push({ phoneNumber: sha256Hex(telefoon) });

  const event: AdsEvent = {
    transactionId: transactionId(rij.aanvraag_id, rij.conversie_actie),
    eventTimestamp: new Date(rij.event_tijdstip).toISOString(),
    eventSource: "WEB",
    conversionValue: Math.round(waarde * 100) / 100,
    currency: "EUR",
    consent: {
      adUserData: naarConsentStatus(rij.consent_ad_user_data),
      adPersonalization: naarConsentStatus(rij.consent_ad_personalization),
    },
  };
  if (klik) event.adIdentifiers = { [klik.type]: klik.waarde };
  if (userIdentifiers.length) event.userData = { userIdentifiers };

  return { soort: "versturen", event, klikType };
}

// ---------------------------------------------------------------------------
// Request-body
// ---------------------------------------------------------------------------

export interface AdsDestinationConfig {
  /** Google Ads klant-ID zonder streepjes, bv. "3395836845". */
  customerId: string;
  /** Manager-account (MCC) waarmee wordt ingelogd; leeg als de gebruiker direct op het account staat. */
  loginCustomerId?: string | null;
  /** Conversion action ID → productDestinationId. */
  conversionActionId: string;
}

export interface IngestEventsRequest {
  destinations: {
    operatingAccount: { accountType: "GOOGLE_ADS"; accountId: string };
    loginAccount?: { accountType: "GOOGLE_ADS"; accountId: string };
    productDestinationId: string;
  }[];
  encoding: "HEX";
  events: AdsEvent[];
  validateOnly?: boolean;
}

export function bouwIngestRequest(
  bestemming: AdsDestinationConfig,
  events: AdsEvent[],
  validateOnly: boolean
): IngestEventsRequest {
  const destination: IngestEventsRequest["destinations"][number] = {
    operatingAccount: { accountType: "GOOGLE_ADS", accountId: bestemming.customerId },
    productDestinationId: bestemming.conversionActionId,
  };
  if (bestemming.loginCustomerId) {
    destination.loginAccount = { accountType: "GOOGLE_ADS", accountId: bestemming.loginCustomerId };
  }
  const body: IngestEventsRequest = { destinations: [destination], encoding: "HEX", events };
  if (validateOnly) body.validateOnly = true;
  return body;
}

/** "339-583-6845" → "3395836845". */
export function normaliseerCustomerId(raw: string): string {
  return raw.replace(/\D/g, "");
}
