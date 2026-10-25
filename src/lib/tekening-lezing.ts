/**
 * Verwerking van de ruwe tekeninglezing (schakel 1, tekeningroute). PUUR, zodat
 * het zonder netwerk/AI te testen is; tekening-lezer.ts roept dit aan.
 */
import { steenbladBuitenScope, valideerTelling, type ValidatieResultaat } from "./rekenen.ts";

export type WerkbladMateriaal = "laminaat" | "hout" | "steen" | "geen" | "onbekend";

/**
 * Ontbrekende later toegevoegde velden op 0, valideren (valideerTelling is de
 * autoriteit), en bij een steenblad dezelfde regel als de planner-route: blad,
 * uitsparingen, koppeling en spoelbak buiten scope.
 */
export function verwerkLezing(
  object: Record<string, unknown> & { werkblad_materiaal?: WerkbladMateriaal }
): ValidatieResultaat {
  const { werkblad_materiaal, ...telling } = object;
  const validatie = valideerTelling({
    ...telling,
    binneninrichting: telling.binneninrichting ?? 0,
    eiland: telling.eiland ?? 0,
  });
  if (!validatie.ok || werkblad_materiaal !== "steen") return validatie;
  return { ok: true, telling: steenbladBuitenScope(validatie.telling) };
}
