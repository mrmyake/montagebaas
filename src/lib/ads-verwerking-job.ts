import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { googleAccessToken } from "@/lib/google-auth";
import {
  REQUEST_STATUS_URL,
  parseRequestStatus,
  selecteerTeControleren,
  verwerkingMislukt,
  type UploadVoorControle,
  type Verwerking,
} from "@/lib/ads-verwerking";

/**
 * Verwerkingscheck: per uniek requestId uit ads_conversie_uploads de status
 * opvragen bij de Data Manager API (requestStatus.retrieve, zelfde service
 * account als de upload) en het resultaat in de kolom `verwerking` zetten
 * op alle rijen die dat requestId delen.
 *
 * Standaard (cron): alleen rijen ouder dan 30 minuten zonder eindstatus.
 * Met `alles`: elk requestId opnieuw (eenmalige volledige controle).
 */

const SCOPE = "https://www.googleapis.com/auth/datamanager";

export interface VerwerkingRapport {
  requestId: string;
  aantalRijen: number;
  verwerking: Verwerking;
  httpStatus?: number;
  weggeschreven: boolean;
}

export interface VerwerkingJobRapport {
  gecontroleerd: number;
  rapporten: VerwerkingRapport[];
}

export async function draaiAdsVerwerkingCheck(
  opties: { alles?: boolean } = {}
): Promise<VerwerkingJobRapport> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("ads_conversie_uploads")
    .select("id, request_id, verzonden_op, verwerking")
    .eq("status", "verstuurd")
    .not("request_id", "is", null)
    .returns<UploadVoorControle[]>();
  if (error) throw new Error(`Uploads lezen mislukt: ${error.message}`);

  const teDoen = selecteerTeControleren(data ?? [], new Date(), opties);
  const rapport: VerwerkingJobRapport = { gecontroleerd: teDoen.length, rapporten: [] };
  if (teDoen.length === 0) return rapport;

  const token = await googleAccessToken(SCOPE);

  for (const { requestId, rijIds } of teDoen) {
    let httpStatus: number | undefined;
    let verwerking: Verwerking;
    try {
      const url = `${REQUEST_STATUS_URL}?${new URLSearchParams({ requestId })}`;
      const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
      httpStatus = res.status;
      const body: unknown = await res.json().catch(() => null);
      verwerking = res.ok
        ? parseRequestStatus(body)
        : verwerkingMislukt(`HTTP ${res.status}: ${JSON.stringify(body).slice(0, 500)}`);
    } catch (err) {
      verwerking = verwerkingMislukt(String(err));
    }

    const { error: updErr } = await db
      .from("ads_conversie_uploads")
      .update({ verwerking })
      .in("id", rijIds);
    if (updErr) console.error("[ads-verwerking] wegschrijven mislukt:", requestId, updErr.message);

    rapport.rapporten.push({
      requestId,
      aantalRijen: rijIds.length,
      verwerking,
      httpStatus,
      weggeschreven: !updErr,
    });
  }
  return rapport;
}
