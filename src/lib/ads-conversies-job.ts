import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { googleAccessToken } from "@/lib/google-auth";
import {
  CONVERSIE_ACTIES,
  beslis,
  bouwIngestRequest,
  normaliseerCustomerId,
  parseUitgeslotenContacten,
  type AdsEvent,
  type Beslissing,
  type ConsentOnbekendBeleid,
  type ConversieActie,
  type TeVersturenRij,
} from "@/lib/ads-conversies";

/**
 * Orkestratie van de dagelijkse upload: werkvoorraad lezen, per rij beslissen,
 * per conversieactie één request naar de Data Manager API, resultaat wegschrijven.
 *
 * Drie modi:
 *  - "plan":     alleen beslissen en rapporteren, niets schrijven, niets versturen;
 *  - "validate": request met validateOnly=true, niets wegschrijven;
 *  - "verzend":  echte upload; resultaten in ads_conversie_uploads.
 *
 * Fast-fail aan Google's kant: faalt één event, dan is de hele request
 * geweigerd. We zetten dan alle rijen van die actie op 'fout' met de response,
 * nooit op 'verstuurd'.
 */

export type JobModus = "plan" | "validate" | "verzend";

const INGEST_URL = "https://datamanager.googleapis.com/v1/events:ingest";
const SCOPE = "https://www.googleapis.com/auth/datamanager";

export interface RijRapport {
  aanvraag: string; // korte id — geen namen of contactgegevens in de output
  actie: ConversieActie;
  eventTijdstip: string;
  waarde: number | null;
  klikType: string;
  tijdstipBron: string;
  besluit: Beslissing["soort"];
  reden?: string;
}

export interface ActieRapport {
  actie: ConversieActie;
  aantalEvents: number;
  verstuurd: boolean;
  httpStatus?: number;
  requestId?: string;
  fieldWarnings?: unknown;
  fout?: unknown;
}

export interface JobRapport {
  modus: JobModus;
  consentOnbekend: ConsentOnbekendBeleid;
  rijen: RijRapport[];
  acties: ActieRapport[];
  samenvatting: Record<Beslissing["soort"], number>;
}

export function leesConsentBeleid(): ConsentOnbekendBeleid {
  const v = process.env.ADS_CONSENT_ONBEKEND?.trim();
  if (v === "overslaan" || v === "unspecified" || v === "wachten") return v;
  return "wachten"; // geen beslissing genomen → niets definitiefs doen
}

const ACTIE_ENV: Record<ConversieActie, string> = {
  aanvraag_ontvangen: "ADS_CONVERSIE_ACTIE_AANVRAAG_ONTVANGEN",
  offerte_verstuurd: "ADS_CONVERSIE_ACTIE_OFFERTE_VERSTUURD",
  opdracht_gewonnen: "ADS_CONVERSIE_ACTIE_OPDRACHT_GEWONNEN",
};

function conversionActionId(actie: ConversieActie): string | null {
  return process.env[ACTIE_ENV[actie]]?.trim() || null;
}

/** Is de koppeling ingericht? Zonder sleutel en klant-ID heeft versturen geen zin. */
export function adsUploadGeconfigureerd(): boolean {
  return Boolean(process.env.GOOGLE_SA_KEY_JSON?.trim() && process.env.ADS_CUSTOMER_ID?.trim());
}

/**
 * Kill switch. Alleen de letterlijke waarde "true" laat de verzend-modus echt
 * versturen en wegschrijven; alles anders (ook ontbrekend) houdt de cron en de
 * directe upload tegen. plan en validate werken altijd.
 */
export function adsUploadActief(): boolean {
  return process.env.ADS_UPLOAD_ACTIEF?.trim() === "true";
}

export async function draaiAdsConversiesJob(
  modus: JobModus,
  filter?: { aanvraagId: string; actie?: ConversieActie }
): Promise<JobRapport> {
  // Zonder sleutel en klant-ID niets lezen of wegschrijven: anders zet de cron
  // rijen definitief op 'overgeslagen' voordat er ooit iets verstuurd is.
  if (modus !== "plan" && !adsUploadGeconfigureerd()) {
    throw new Error(
      "Ads-upload niet ingericht (GOOGLE_SA_KEY_JSON en/of ADS_CUSTOMER_ID ontbreekt); niets gedaan."
    );
  }
  if (modus === "verzend" && !adsUploadActief()) {
    throw new Error("ADS_UPLOAD_ACTIEF staat niet op 'true'; niets verzonden of weggeschreven.");
  }

  const db = supabaseAdmin();
  const consentOnbekend = leesConsentBeleid();
  const uitgesloten = parseUitgeslotenContacten(process.env.ADS_UITGESLOTEN_CONTACTEN);

  let query = db.from("ads_conversies_te_versturen").select("*");
  if (filter) {
    query = query.eq("aanvraag_id", filter.aanvraagId);
    if (filter.actie) query = query.eq("conversie_actie", filter.actie);
  }
  const { data, error } = await query.returns<TeVersturenRij[]>();
  if (error) throw new Error(`Werkvoorraad lezen mislukt: ${error.message}`);
  const rijen = data ?? [];

  const rapport: JobRapport = {
    modus,
    consentOnbekend,
    rijen: [],
    acties: [],
    samenvatting: { versturen: 0, overslaan: 0, wachten: 0 },
  };

  const perActie = new Map<ConversieActie, { rij: TeVersturenRij; event: AdsEvent }[]>();
  for (const a of CONVERSIE_ACTIES) perActie.set(a, []);

  for (const rij of rijen) {
    const b = beslis(rij, { consentOnbekend, uitgesloten });
    rapport.samenvatting[b.soort] += 1;
    rapport.rijen.push({
      aanvraag: rij.aanvraag_id.slice(0, 8),
      actie: rij.conversie_actie,
      eventTijdstip: rij.event_tijdstip,
      waarde: rij.waarde === null ? null : Number(rij.waarde),
      klikType: b.klikType ?? "geen",
      tijdstipBron: rij.tijdstip_bron,
      besluit: b.soort,
      reden: b.soort === "versturen" ? undefined : b.reden,
    });

    if (modus !== "verzend") {
      if (b.soort === "versturen") perActie.get(rij.conversie_actie)!.push({ rij, event: b.event });
      continue;
    }

    if (b.soort === "overslaan") {
      await upsertUpload(db, rij, { status: "overgeslagen", reden: b.reden });
    } else if (b.soort === "wachten") {
      await upsertUpload(db, rij, { status: "wachtend", reden: b.reden });
    } else {
      perActie.get(rij.conversie_actie)!.push({ rij, event: b.event });
    }
  }

  if (modus === "plan") return rapport;

  const customerId = normaliseerCustomerId(process.env.ADS_CUSTOMER_ID ?? "");
  if (!customerId) throw new Error("ADS_CUSTOMER_ID ontbreekt.");
  const loginCustomerId = process.env.ADS_LOGIN_CUSTOMER_ID
    ? normaliseerCustomerId(process.env.ADS_LOGIN_CUSTOMER_ID)
    : null;

  let token: string | null = null;

  for (const actie of CONVERSIE_ACTIES) {
    const items = perActie.get(actie)!;
    if (items.length === 0) continue;

    const actieRapport: ActieRapport = { actie, aantalEvents: items.length, verstuurd: false };
    rapport.acties.push(actieRapport);

    const actionId = conversionActionId(actie);
    if (!actionId) {
      actieRapport.fout = `Conversion action ID voor ${actie} ontbreekt (env).`;
      continue;
    }

    token ??= await googleAccessToken(SCOPE);
    const body = bouwIngestRequest(
      { customerId, loginCustomerId, conversionActionId: actionId },
      items.map((i) => i.event),
      modus === "validate"
    );

    let httpStatus = 0;
    let response: unknown = null;
    try {
      const res = await fetch(INGEST_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      httpStatus = res.status;
      response = await res.json().catch(() => ({ raw: "geen json" }));
    } catch (err) {
      response = { error: String(err) };
    }
    actieRapport.httpStatus = httpStatus;

    const ok = httpStatus >= 200 && httpStatus < 300;
    const r = (response ?? {}) as { requestId?: string; fieldWarnings?: unknown };
    if (ok) {
      actieRapport.verstuurd = modus === "verzend";
      actieRapport.requestId = r.requestId;
      actieRapport.fieldWarnings = r.fieldWarnings;
    } else {
      actieRapport.fout = response;
    }

    if (modus !== "verzend") continue;

    for (const { rij } of items) {
      await upsertUpload(
        db,
        rij,
        ok
          ? {
              status: "verstuurd",
              reden: null,
              request_id: r.requestId ?? null,
              response: response as object,
              verzonden_op: new Date().toISOString(),
            }
          : { status: "fout", reden: `HTTP ${httpStatus}`, response: response as object }
      );
    }
  }

  return rapport;
}

async function upsertUpload(
  db: ReturnType<typeof supabaseAdmin>,
  rij: TeVersturenRij,
  velden: {
    status: "wachtend" | "verstuurd" | "fout" | "overgeslagen";
    reden: string | null;
    request_id?: string | null;
    response?: object | null;
    verzonden_op?: string | null;
  }
): Promise<void> {
  const { error } = await db.from("ads_conversie_uploads").upsert(
    {
      aanvraag_id: rij.aanvraag_id,
      conversie_actie: rij.conversie_actie,
      event_tijdstip: rij.event_tijdstip,
      waarde: rij.waarde === null ? 0 : Number(rij.waarde),
      ...velden,
    },
    { onConflict: "aanvraag_id,conversie_actie" }
  );
  if (error) {
    console.error("[ads-conversies] upsert mislukt:", rij.aanvraag_id, rij.conversie_actie, error.message);
  }
}

/**
 * Directe verzending van één aanvraag, bedoeld voor `after()` vlak na de insert
 * (aanvraag_ontvangen). Mag nooit gooien en nooit de formulierrespons raken:
 * elke fout wordt gelogd en de dagelijkse cron probeert het opnieuw. Zonder
 * ingerichte koppeling gebeurt er niets, zodat er ook geen 'fout'-rijen
 * ontstaan voordat de env-vars gezet zijn.
 */
export async function verstuurAdsConversieDirect(
  aanvraagId: string,
  actie: ConversieActie = "aanvraag_ontvangen"
): Promise<void> {
  if (!adsUploadGeconfigureerd() || !adsUploadActief()) return;
  try {
    const rapport = await draaiAdsConversiesJob("verzend", { aanvraagId, actie });
    const fout = rapport.acties.find((a) => a.fout !== undefined);
    if (fout) console.error("[ads-conversies] directe verzending mislukt:", aanvraagId, actie, fout.fout);
  } catch (err) {
    console.error("[ads-conversies] directe verzending gooide:", aanvraagId, actie, err);
  }
}
