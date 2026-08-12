import Link from "next/link";

export const metadata = {
  title: "Admin — Montagebaas",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 flex items-center gap-4 border-b border-[var(--color-line)] pb-4">
        <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--color-ink)]">
          Montagebaas admin
        </span>
        <Link href="/admin/leads" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]">
          Leads
        </Link>
        <Link href="/admin/roi" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]">
          ROI
        </Link>
      </nav>
      {children}
    </div>
  );
}
