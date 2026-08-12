import { supabaseAdmin } from "@/lib/supabase";
import type { RoiPerMaandRow } from "@/lib/db.types";
import { AdvertentiekostenForm } from "./AdvertentiekostenForm";

export const metadata = { title: "ROI — Montagebaas admin" };
// Zonder dit prerendert Next deze pagina statisch op build-time (geen
// searchParams/cookies/headers om dynamisch renderen te forceren), en zou
// hij bevroren build-time cijfers tonen totdat revalidatePath ooit vuurt.
export const dynamic = "force-dynamic";

function formatteerMaand(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

function euro(bedrag: number | null): string {
  if (bedrag === null) return "—";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(bedrag);
}

const KANAAL_LABELS: Record<RoiPerMaandRow["kanaal"], string> = {
  werkspot: "Werkspot",
  google_ads: "Google Ads",
  organisch_of_onbekend: "Organisch / onbekend",
};

export default async function AdminRoiPage() {
  const db = supabaseAdmin();
  const { data, error } = await db.from("roi_per_maand").select("*").returns<RoiPerMaandRow[]>();

  return (
    <div>
      <h1 className="mb-4 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">ROI per maand</h1>

      <div className="mb-6">
        <AdvertentiekostenForm />
      </div>

      {error && <p className="text-red-600">Kon ROI-data niet laden: {error.message}</p>}

      {!error && data && data.length === 0 && <p className="text-[var(--color-muted)]">Nog geen data.</p>}

      {!error && data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line-strong)] text-left text-[var(--color-muted)]">
                <th className="py-2 pr-3">Maand</th>
                <th className="py-2 pr-3">Kanaal</th>
                <th className="py-2 pr-3 text-right">Aanvragen</th>
                <th className="py-2 pr-3 text-right">Gewonnen</th>
                <th className="py-2 pr-3 text-right">Verloren</th>
                <th className="py-2 pr-3 text-right">Geen reactie</th>
                <th className="py-2 pr-3 text-right">Conversie</th>
                <th className="py-2 pr-3 text-right">Omzet</th>
                <th className="py-2 pr-3 text-right">Kosten</th>
                <th className="py-2 pr-3 text-right">€ / lead</th>
                <th className="py-2 pr-3 text-right">€ / klus</th>
                <th className="py-2 pr-3 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={`${row.maand}-${row.kanaal}-${i}`} className="border-b border-[var(--color-line)]">
                  <td className="py-2 pr-3 whitespace-nowrap capitalize">{formatteerMaand(row.maand)}</td>
                  <td className="py-2 pr-3">{KANAAL_LABELS[row.kanaal]}</td>
                  <td className="py-2 pr-3 text-right">{row.aanvragen}</td>
                  <td className="py-2 pr-3 text-right">{row.gewonnen}</td>
                  <td className="py-2 pr-3 text-right">{row.verloren}</td>
                  <td className="py-2 pr-3 text-right">{row.geen_reactie}</td>
                  <td className="py-2 pr-3 text-right">{row.conversie_pct ?? "—"}%</td>
                  <td className="py-2 pr-3 text-right">{euro(row.omzet)}</td>
                  <td className="py-2 pr-3 text-right">{euro(row.kosten)}</td>
                  <td className="py-2 pr-3 text-right">{euro(row.kosten_per_lead)}</td>
                  <td className="py-2 pr-3 text-right">{euro(row.kosten_per_klus)}</td>
                  <td className="py-2 pr-3 text-right">{row.roas ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
