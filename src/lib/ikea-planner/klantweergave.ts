/**
 * Wat de klant na het lezen van een planner-link ziet: chips, bonregels en
 * meldingen. PUUR. De aannames in de telling zijn voor Ilja geschreven (met
 * bedragen en vaktermen); hier worden alleen de klantrelevante eruit vertaald.
 */
import type { KeukenTelling } from "../rekenen.ts";
import type { Artikel } from "./bom.ts";
import type { PlannerTelling, WerkbladSoort } from "./telling.ts";

export interface Klantweergave {
  chips: string[];
  bon: { label: string; waarde: string }[];
  meldingen: string[];
  werkblad: WerkbladSoort;
}

const APPARAAT_VELDEN: (keyof KeukenTelling)[] = [
  "vaatwasser", "inductie", "gaskookplaat", "afzuigkap", "oven", "koelkast_vriezer", "magnetron",
];

const n = (t: KeukenTelling, k: keyof KeukenTelling) => (typeof t[k] === "number" ? (t[k] as number) : 0);
const meervoud = (aantal: number, een: string, meer: string) => `${aantal} ${aantal === 1 ? een : meer}`;

/** ["a", "b", "c"] → "a, b en c" */
const opsomming = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} en ${xs.at(-1)}`);

function werkbladNaam(artikelen: Artikel[]): string | null {
  const blad = artikelen.find((a) => a.soort === "werkblad" || a.soort === "maatwerkblad");
  return blad?.naam ? blad.naam.toUpperCase() : null;
}

export function klantweergave(r: Pick<PlannerTelling, "telling" | "artikelen" | "werkblad">): Klantweergave {
  const t = r.telling;
  const kasten = Math.round(n(t, "onderkasten") + n(t, "bovenkasten") + n(t, "hoge_kasten"));
  const apparaten = Math.round(APPARAAT_VELDEN.reduce((s, k) => s + n(t, k), 0));
  const spoelbak = n(t, "spoelbak_kraan") > 0;
  const eiland = n(t, "eiland") > 0;
  const blad = werkbladNaam(r.artikelen);

  const chips: string[] = [];
  const bon: Klantweergave["bon"] = [];

  if (kasten) {
    chips.push(meervoud(kasten, "kast", "kasten"));
    bon.push({ label: "Kasten", waarde: eiland ? `${kasten}, met kookeiland` : String(kasten) });
  }
  if (eiland) chips.push("Met kookeiland");

  const bladTekst: Partial<Record<WerkbladSoort, string>> = {
    maatwerk_laminaat: "voorgezaagd",
    laminaat_op_locatie: "op maat zagen",
    steen: "plaatst de leverancier",
    hout: "massief hout",
  };
  if (r.werkblad !== "geen") {
    const naam = blad ? `${blad}-werkblad` : "Werkblad";
    const wat = bladTekst[r.werkblad];
    chips.push(wat ? `${naam}, ${wat}` : naam);
    bon.push({ label: blad ? `Werkblad ${blad}` : "Werkblad", waarde: wat ?? "in je ontwerp" });
  }
  if (apparaten) {
    chips.push(meervoud(apparaten, "inbouwapparaat", "inbouwapparaten"));
    bon.push({ label: `Apparaten, ${apparaten} st`, waarde: "inbegrepen" });
  }
  if (spoelbak) {
    chips.push("Spoelbak met kraan");
    bon.push({ label: "Spoelbak en kraan", waarde: "inbegrepen" });
  }

  // Meldingen voor de klant, afgeleid uit de aannames van telling.ts.
  const meldingen: string[] = [];
  const aannames = t.aannames ?? [];
  for (const a of aannames) {
    const m = a.match(/^Eiland met (.+?): (.+)$/);
    if (m) meldingen.push(`Je kookeiland krijgt een ${m[1]}. ${m[2][0].toUpperCase()}${m[2].slice(1)}`);
    else if (a.startsWith("Eiland/vrijstaand blok")) meldingen.push("We zien een kookeiland of vrijstaand blok in je ontwerp. Dat nemen we mee in je vaste prijs.");
  }
  const eigen = aannames
    .map((a) => a.match(/^Geen (.+?) in de lijst: eigen apparaat/)?.[1])
    .filter((x): x is string => !!x);
  if (eigen.length) {
    meldingen.push(
      `Geen ${opsomming(eigen)} in je ontwerp. Gebruik je een eigen apparaat? Dan vragen we merk en type, zodat de nis klopt.`
    );
  }
  const onbekend = aannames.filter((a) => a.startsWith("Niet herkend")).length;
  if (onbekend) {
    meldingen.push(
      `${meervoud(onbekend, "artikel herkennen", "artikelen herkennen")} we niet automatisch. Die lopen we na voor je vaste prijs.`
    );
  }
  const weg = aannames.filter((a) => a.startsWith("Niet meer leverbaar")).length;
  if (weg) {
    meldingen.push(
      `${meervoud(weg, "artikel in je ontwerp is", "artikelen in je ontwerp zijn")} niet meer leverbaar bij IKEA. We checken je bestelling.`
    );
  }
  if (r.werkblad === "steen") {
    meldingen.push("Je werkblad is van steen of composiet. Dat meet en plaatst de leverancier, wij doen de rest.");
  }

  return { chips, bon, meldingen, werkblad: r.werkblad };
}

/**
 * Het werkbladtype uit een opgeslagen telling (planner_snapshots.telling heeft
 * geen apart werkbladveld). telling.ts schrijft deze aanname dan en alleen dan
 * als het werkblad laminaat op standaardlengte is.
 */
export function werkbladUitTelling(t: Pick<KeukenTelling, "aannames">): WerkbladSoort | null {
  return t.aannames.some((a) => a.startsWith("Laminaat werkblad op standaardlengte")) ? "laminaat_op_locatie" : null;
}
