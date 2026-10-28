import { koppelStatus } from "@/lib/gmail/client";
import { OfferteTool } from "./OfferteTool";

export const metadata = { title: "Offerte — admin" };
export const dynamic = "force-dynamic";

export default async function OffertePagina({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string; reden?: string }>;
}) {
  const [status, sp] = await Promise.all([koppelStatus(), searchParams]);
  return (
    <div>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">Offerte maken</h1>
      <p className="mb-6 text-sm text-[var(--color-ink-soft)]">
        Plak een IKEA planner-link. Telling, signalen en prijzen zijn intern; de mail gaat alleen als Gmail-draft naar{" "}
        {status.account}, nooit automatisch de deur uit.
      </p>
      <OfferteTool gmail={status} melding={sp.gmail ? { status: sp.gmail, reden: sp.reden ?? null } : null} />
    </div>
  );
}
