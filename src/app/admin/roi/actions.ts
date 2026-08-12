"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { verifieerAdminSessie } from "@/lib/admin-auth";

export type AddKostenResult = { error?: string };

export async function addAdvertentiekosten(
  _prevState: AddKostenResult,
  formData: FormData
): Promise<AddKostenResult> {
  await verifieerAdminSessie();

  const maandRaw = formData.get("maand")?.toString(); // "YYYY-MM" van <input type="month">
  const kanaal = formData.get("kanaal")?.toString().trim();
  const campagne = formData.get("campagne")?.toString().trim() || null;
  const kostenRaw = formData.get("kosten")?.toString();

  if (!maandRaw || !kanaal || !kostenRaw) {
    return { error: "Maand, kanaal en kosten zijn verplicht." };
  }

  const kosten = Number(kostenRaw.replace(",", "."));
  if (!Number.isFinite(kosten) || kosten < 0) {
    return { error: "Kosten moet een positief getal zijn." };
  }

  const maand = `${maandRaw}-01`; // altijd de eerste van de maand

  const db = supabaseAdmin();
  const { error } = await db.from("advertentiekosten").insert({ maand, kanaal, campagne, kosten });

  if (error) return { error: error.message };

  revalidatePath("/admin/roi");
  return {};
}
