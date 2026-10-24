/**
 * Eén ontwerp volledig uitlezen: ophalen → BOM → productgegevens → telling.
 * Gedeeld door de lead-verwerker en de dagelijkse monitor. Gooit een PlannerFout.
 */
import { haalOntwerp, type OpgehaaldOntwerp } from "./client.ts";
import { bomIds, leesBom, referentieIds, type BomNode } from "./bom.ts";
import { haalProducten } from "./producten.ts";
import { bomNaarTelling, type PlannerTelling } from "./telling.ts";
import type { ProductInfo } from "./product.ts";

export interface GelezenOntwerp {
  ontwerp: OpgehaaldOntwerp;
  bom: BomNode;
  producten: Record<string, ProductInfo>;
  resultaat: PlannerTelling;
  zonderProductgegevens: string[]; // BOM-ids waarvoor IKEA geen productgegevens gaf
}

export async function leesOntwerp(uuid: string): Promise<GelezenOntwerp> {
  const ontwerp = await haalOntwerp(uuid);
  const { bom } = leesBom(ontwerp.metadata);

  // Sequentieel: eerst alles uit de BOM, dan de ART-nummers waar maatwerk (EXT) naar verwijst.
  const ids = bomIds(bom);
  let producten = await haalProducten(ids);
  const refs = referentieIds(bom, producten);
  if (refs.length) producten = { ...producten, ...(await haalProducten(refs)) };

  const zonderProductgegevens = ids.filter((id) => !producten[id]?.omschrijving);
  const resultaat = bomNaarTelling(bom, producten, {
    projectNaam: ontwerp.projectNaam,
    datumOpgeslagen: ontwerp.datumOpgeslagen,
  });
  if (zonderProductgegevens.length) {
    resultaat.telling.aannames.push(
      `Geen productgegevens voor ${zonderProductgegevens.length} artikel(en) (${zonderProductgegevens.slice(0, 5).join(", ")}): niet meegeteld, telling mogelijk te laag`
    );
  }
  return { ontwerp, bom, producten, resultaat, zonderProductgegevens };
}
