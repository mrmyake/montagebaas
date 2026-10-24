/**
 * Productgegevens per IKEA-id, met cache in `montagebaas.ikea_artikelen`.
 * Ontbrekende of verouderde rijen (> 30 dagen) worden bij IKEA opgehaald en
 * weggeschreven. Lukt dat ophalen niet maar staat er nog een oude rij, dan
 * gebruiken we die: liever een maand oude omschrijving dan een mislukte lead.
 */
import { supabaseAdmin } from "@/lib/supabase";
import { haalProductenRuw } from "./client.ts";
import { ingekort, productUitApi, type ProductInfo } from "./product.ts";

const MAX_LEEFTIJD_MS = 30 * 24 * 60 * 60 * 1000;

interface ArtikelRij {
  db_id: string;
  artikelnummer: string | null;
  referentie: string | null;
  naam: string;
  omschrijving: string;
  maat: string | null;
  breedte: number | null;
  diepte: number | null;
  hoogte: number | null;
  leverbaar: boolean | null;
  eind_datum: string | null;
  bijgewerkt_op: string;
}

const rijNaarInfo = (r: ArtikelRij): ProductInfo => ({
  dbId: r.db_id,
  artikelnummer: r.artikelnummer,
  referentie: r.referentie,
  naam: r.naam,
  omschrijving: r.omschrijving,
  maat: r.maat,
  breedte: r.breedte === null ? null : Number(r.breedte),
  diepte: r.diepte === null ? null : Number(r.diepte),
  hoogte: r.hoogte === null ? null : Number(r.hoogte),
  leverbaar: r.leverbaar,
  eindDatum: r.eind_datum,
});

export async function haalProducten(ids: string[]): Promise<Record<string, ProductInfo>> {
  const uniek = [...new Set(ids)];
  if (!uniek.length) return {};
  const db = supabaseAdmin();

  const { data, error } = await db.from("ikea_artikelen").select("*").in("db_id", uniek);
  if (error) console.error("[planner] ikea_artikelen lezen mislukt:", error.message);
  const bekend = new Map<string, ArtikelRij>(((data ?? []) as ArtikelRij[]).map((r) => [r.db_id, r]));

  const grens = Date.now() - MAX_LEEFTIJD_MS;
  const nodig = uniek.filter((id) => {
    const r = bekend.get(id);
    return !r || Date.parse(r.bijgewerkt_op) < grens;
  });

  const uit: Record<string, ProductInfo> = {};
  for (const [id, r] of bekend) uit[id] = rijNaarInfo(r);

  if (nodig.length) {
    let ruw: Record<string, unknown>;
    try {
      ruw = await haalProductenRuw(nodig);
    } catch (e) {
      // Zonder ontbrekende ids kunnen we niet verder; met alleen verouderde wel.
      if (nodig.some((id) => !bekend.has(id))) throw e;
      console.warn("[planner] productgegevens verversen mislukt, oude cache gebruikt:", e);
      return uit;
    }
    const nu = new Date();
    const rijen = Object.entries(ruw).map(([id, p]) => {
      const info = productUitApi(id, p, nu);
      uit[id] = info;
      return {
        db_id: id,
        artikelnummer: info.artikelnummer,
        referentie: info.referentie,
        naam: info.naam,
        omschrijving: info.omschrijving,
        maat: info.maat,
        breedte: info.breedte,
        diepte: info.diepte,
        hoogte: info.hoogte,
        leverbaar: info.leverbaar,
        eind_datum: info.eindDatum,
        ruw: ingekort(p),
        bijgewerkt_op: nu.toISOString(),
      };
    });
    if (rijen.length) {
      const { error: upErr } = await db.from("ikea_artikelen").upsert(rijen);
      if (upErr) console.error("[planner] ikea_artikelen bijwerken mislukt:", upErr.message);
    }
  }
  return uit;
}
