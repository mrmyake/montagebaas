import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { LEAD_STATUSSEN, LEAD_BRONNEN, type LeadOverzichtRow, type LeadStatus, type LeadBron } from "@/lib/db.types";
import { LeadRowForm } from "./LeadRowForm";

export const metadata = { title: "Leads — Montagebaas admin" };
// searchParams maakt deze pagina al dynamisch; expliciet voor de duidelijkheid
// en als bescherming tegen een toekomstige refactor die dat weghaalt.
export const dynamic = "force-dynamic";

// Statussen waarin een lead is afgehandeld — stilte hierop hoeft niet opgevolgd te worden.
const AFGEHANDELDE_STATUSSEN: LeadStatus[] = ["gewonnen", "uitgevoerd", "verloren", "geen_reactie", "niet_passend"];

const STATUS_LABELS: Record<LeadStatus, string> = {
  nieuw: "Nieuw",
  contact_gelegd: "Contact gelegd",
  offerte_verstuurd: "Offerte verstuurd",
  wacht_op_klant: "Wacht op klant",
  gewonnen: "Gewonnen",
  uitgevoerd: "Uitgevoerd",
  verloren: "Verloren",
  geen_reactie: "Geen reactie",
  niet_passend: "Niet passend",
};

const BRON_LABELS: Record<LeadBron, string> = {
  website: "Website",
  werkspot: "Werkspot",
  doorverwijzing: "Doorverwijzing",
  overig: "Overig",
};

function formatteerDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function dagenStil(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; bron?: string }>;
}) {
  const { status, bron } = await searchParams;

  const db = supabaseAdmin();
  let query = db.from("lead_overzicht").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("lead_status", status);
  if (bron) query = query.eq("bron", bron);

  const { data, error } = await query.returns<LeadOverzichtRow[]>();

  return (
    <div>
      <h1 className="mb-4 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">
        Leads
      </h1>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm text-[var(--color-ink-soft)]">
          Status
          <select name="status" defaultValue={status ?? ""} className="mt-1 rounded border border-[var(--color-line-strong)] px-2 py-1">
            <option value="">Alle</option>
            {LEAD_STATUSSEN.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm text-[var(--color-ink-soft)]">
          Bron
          <select name="bron" defaultValue={bron ?? ""} className="mt-1 rounded border border-[var(--color-line-strong)] px-2 py-1">
            <option value="">Alle</option>
            {LEAD_BRONNEN.map((b) => (
              <option key={b} value={b}>
                {BRON_LABELS[b]}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="rounded bg-[var(--color-ink)] px-3 py-1.5 text-sm text-white">
          Filteren
        </button>
        {(status || bron) && (
          <Link href="/admin/leads" className="text-sm text-[var(--color-muted)] underline">
            Wis filters
          </Link>
        )}
      </form>

      {error && <p className="text-red-600">Kon leads niet laden: {error.message}</p>}

      {!error && data && data.length === 0 && <p className="text-[var(--color-muted)]">Geen leads gevonden.</p>}

      {!error && data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line-strong)] text-left text-[var(--color-muted)]">
                <th className="py-2 pr-3">Naam</th>
                <th className="py-2 pr-3">Datum</th>
                <th className="py-2 pr-3">Bron</th>
                <th className="py-2 pr-3">Betaalde klik</th>
                <th className="py-2 pr-3">Campagne</th>
                <th className="py-2 pr-3">Stil sinds</th>
                <th className="py-2 pr-3">Status / bedragen</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const stil = dagenStil(row.lead_status_gewijzigd_op);
                const behoeftOpvolging = !AFGEHANDELDE_STATUSSEN.includes(row.lead_status);
                const gemarkeerd = behoeftOpvolging && stil > 7;
                return (
                  <tr key={row.id} className="border-b border-[var(--color-line)] align-top">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-[var(--color-ink)]">{row.naam}</div>
                      <div className="text-xs text-[var(--color-muted)]">
                        {row.email} · {row.telefoon}
                      </div>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatteerDatum(row.created_at)}</td>
                    <td className="py-2 pr-3">{BRON_LABELS[row.bron]}</td>
                    <td className="py-2 pr-3">{row.betaalde_klik ? "Ja" : "Nee"}</td>
                    <td className="py-2 pr-3">{row.utm_campaign ?? "—"}</td>
                    <td className={`py-2 pr-3 whitespace-nowrap ${gemarkeerd ? "font-semibold text-[var(--color-accent)]" : ""}`}>
                      {stil} {stil === 1 ? "dag" : "dagen"}
                      {gemarkeerd && " ⚠"}
                    </td>
                    <td className="py-2 pr-3">
                      <LeadRowForm
                        aanvraagId={row.id}
                        initieleStatus={row.lead_status}
                        initieelOfferteBedrag={row.offerte_bedrag}
                        initieelGefactureerdBedrag={row.gefactureerd_bedrag}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
