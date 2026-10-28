"use server";

import { verifieerAdminSessie } from "@/lib/admin-auth";
import { GmailKoppelingFout } from "@/lib/gmail/client";
import { LEAD_BRONNEN, type LeadBron } from "@/lib/db.types";
import {
  analyseerLink,
  maakOfferteDraft,
  plaatsBijPostcode,
  slaOp,
  type AnalyseUitkomst,
  type DraftInvoer,
  type DraftUitkomst,
  type OpslaanInvoer,
  type OpslaanUitkomst,
} from "@/lib/admin-offerte/server";

// Server actions van /admin/offerte. proxy.ts dekt /admin/*; verifieerAdminSessie
// herhaalt de Basic-Auth-check vlak bij elke actie (zelfde patroon als /admin/leads).

export async function leesLinkActie(plannerUrl: string): Promise<AnalyseUitkomst> {
  await verifieerAdminSessie();
  return analyseerLink(plannerUrl);
}

export async function plaatsActie(postcode: string): Promise<string | null> {
  await verifieerAdminSessie();
  return plaatsBijPostcode(postcode);
}

export type DraftActieUitkomst = ({ ok: true } & DraftUitkomst) | { ok: false; herkoppelen: boolean; fout: string };

export async function maakDraftActie(i: DraftInvoer): Promise<DraftActieUitkomst> {
  await verifieerAdminSessie();
  if (!i.tekst.trim()) return { ok: false, herkoppelen: false, fout: "Mailtekst is leeg." };
  try {
    return { ok: true, ...(await maakOfferteDraft(i)) };
  } catch (e) {
    console.error("[admin-offerte] draft mislukt:", e);
    return { ok: false, herkoppelen: e instanceof GmailKoppelingFout, fout: (e as Error).message };
  }
}

export async function slaOpActie(i: OpslaanInvoer): Promise<OpslaanUitkomst> {
  await verifieerAdminSessie();
  if (!i.naam.trim()) return { ok: false, fout: "Klantnaam is verplicht om op te slaan." };
  if (i.email.trim() && !/^\S+@\S+\.\S+$/.test(i.email.trim())) return { ok: false, fout: "Klant-e-mail is ongeldig." };
  if (!LEAD_BRONNEN.includes(i.bron as LeadBron)) return { ok: false, fout: "Ongeldige bron." };
  if (!(i.compleet > 0 && i.montageklaar > 0)) return { ok: false, fout: "Geen prijs om op te slaan." };
  try {
    return await slaOp(i);
  } catch (e) {
    return { ok: false, fout: (e as Error).message };
  }
}
