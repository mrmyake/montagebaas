/**
 * Herkent een gedeelde IKEA Keukenplanner-link in vrije tekst en haalt de
 * ontwerp-UUID eruit. PUUR (geen imports), draait zowel in de browser (directe
 * feedback in het formulier) als op de server (de echte validatie).
 *
 * Twee formaten komen voor, allebei met dezelfde UUID:
 *   https://kitchen.planner.ikea.com/nl/nl/planner/<UUID>/?ref=share
 *   https://kitchen.planner.ikea.com/nl/nl/remote/<UUID>/view/
 * Taal-/landcode, `?ref=share`, het protocol en hoofdletters in de UUID variëren.
 * Klanten plakken vaak uit WhatsApp of mail, dus er kan tekst, witruimte of
 * `<…>` omheen staan.
 */

export type PlannerLink =
  | { ok: true; uuid: string; url: string }
  | { ok: false };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const LINK = new RegExp(
  "(?:https?://)?kitchen\\.planner\\.ikea\\.com" +
    "((?:/[a-z]{2,3}(?:[-_][a-z]{2,4})?){0,2})" + // /nl/nl, /be/fr, /de/de …
    `/(planner|remote)/(${UUID})(/view)?(?=[/?#\\s>"')\\]]|$)`,
  "i"
);

export function parsePlannerLink(invoer: string | null | undefined): PlannerLink {
  if (!invoer) return { ok: false };
  const m = invoer.match(LINK);
  if (!m) return { ok: false };
  const [, locale, soort, uuidRuw] = m;
  const uuid = uuidRuw.toUpperCase();
  const pad = soort.toLowerCase() === "remote" ? `remote/${uuid}/view/` : `planner/${uuid}/`;
  return { ok: true, uuid, url: `https://kitchen.planner.ikea.com${locale.toLowerCase()}/${pad}` };
}
