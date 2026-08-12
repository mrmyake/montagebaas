"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { verifieerAdminSessie } from "@/lib/admin-auth";
import { LEAD_STATUSSEN, LEAD_STATUSSEN_MET_FACTUUR, type LeadStatus } from "@/lib/db.types";

export type UpdateLeadResult = { error?: string };

function parseBedrag(raw: FormDataEntryValue | null): number | null {
  if (raw === null) return null;
  const tekst = raw.toString().trim();
  if (tekst === "") return null;
  const bedrag = Number(tekst.replace(",", "."));
  return Number.isFinite(bedrag) ? bedrag : null;
}

export async function updateLead(
  aanvraagId: string,
  _prevState: UpdateLeadResult,
  formData: FormData
): Promise<UpdateLeadResult> {
  await verifieerAdminSessie();

  const leadStatusRaw = formData.get("lead_status")?.toString();
  if (!leadStatusRaw || !LEAD_STATUSSEN.includes(leadStatusRaw as LeadStatus)) {
    return { error: "Ongeldige status." };
  }
  const leadStatus = leadStatusRaw as LeadStatus;
  const magFactuur = LEAD_STATUSSEN_MET_FACTUUR.includes(leadStatus);

  const offerteBedrag = parseBedrag(formData.get("offerte_bedrag"));
  // Serverside afgedwongen, niet alleen client-side: bij een status zonder
  // factuurrecht wordt gefactureerd_bedrag altijd null, ongeacht wat de
  // (uitgeschakelde) client-input meestuurt. Voorkomt de db check-constraint-fout.
  const gefactureerdBedrag = magFactuur ? parseBedrag(formData.get("gefactureerd_bedrag")) : null;

  const db = supabaseAdmin();
  const { error } = await db
    .from("aanvragen")
    .update({
      lead_status: leadStatus,
      offerte_bedrag: offerteBedrag,
      gefactureerd_bedrag: gefactureerdBedrag,
    })
    .eq("id", aanvraagId);

  if (error) return { error: error.message };

  revalidatePath("/admin/leads");
  return {};
}
