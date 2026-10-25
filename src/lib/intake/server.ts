import "server-only";
import { regioUitPostcode } from "@/lib/configurator";
import type { AanvraagInsert, SiteVersie } from "@/lib/db.types";
import { isGeldigePostcode, leesGrootte, leesOpstelling, leesPakket, leesPeriode } from "@/lib/intake/velden";

/**
 * De velden die de nieuwe intake extra meestuurt naar /api/offerte-link en
 * /api/offerte-upload. Alles optioneel: de oude site (/offerte-oud) stuurt ze
 * niet en krijgt dan site_versie v1-oud. Ongeldige waarden worden null, nooit
 * een fout: de lead mag niet verloren gaan op een keuzeveld.
 */
export function leesIntakeVelden(form: FormData) {
  const tekst = (k: string) => ((form.get(k) as string | null) ?? "").trim();

  const postcodeRuw = tekst("postcode");
  const postcode = isGeldigePostcode(postcodeRuw) ? postcodeRuw.toUpperCase() : null;
  const demontage = tekst("demontage");
  const site_versie: SiteVersie = tekst("site_versie") === "v2-redesign" ? "v2-redesign" : "v1-oud";

  const velden: Partial<AanvraagInsert> = {
    site_versie,
    pakket_gekozen: leesPakket(tekst("pakket")),
    demontage_gekozen: demontage === "1" ? true : demontage === "0" ? false : null,
    aantal_kasten_range: leesGrootte(tekst("grootte")),
    opstelling: leesOpstelling(tekst("opstelling")),
    gewenste_periode: leesPeriode(tekst("periode")),
    toelichting: tekst("toelichting").slice(0, 2000) || null,
    postcode,
    regio: postcode ? regioUitPostcode(postcode) : null,
  };
  // Lege velden niet meesturen: de insert laat de kolom dan op zijn default.
  return Object.fromEntries(Object.entries(velden).filter(([, v]) => v !== null)) as Partial<AanvraagInsert>;
}
