import Link from "next/link";
import { Phone, FileText } from "lucide-react";
import { WhatsappIcon } from "@/components/brand/WhatsappIcon";
import { site, whatsappDefault } from "@/lib/site";

/**
 * Sticky mobiele CTA-balk onderaan: Bellen | WhatsApp | Offerte.
 * Alleen zichtbaar op mobiel/tablet (verborgen ≥ lg).
 */
export function MobileCtaBar() {
  return (
    // Schuift omhoog zolang de cookiebalk zichtbaar is (--consent-bar-h, zie ConsentBanner).
    <div
      className="fixed inset-x-0 z-40 border-t border-line bg-surface/95 backdrop-blur transition-[bottom] lg:hidden"
      style={{ bottom: "var(--consent-bar-h, 0px)" }}
    >
      <div className="grid grid-cols-3 divide-x divide-line pb-[env(safe-area-inset-bottom)]">
        <a
          href={site.telefoonLink}
          className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-semibold text-ink"
        >
          <Phone size={20} className="text-ink-soft" />
          Bellen
        </a>
        <a
          href={whatsappDefault}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-semibold text-ink"
        >
          <WhatsappIcon size={20} className="text-trust" />
          WhatsApp
        </a>
        <Link
          href="/offerte"
          className="flex flex-col items-center justify-center gap-0.5 bg-accent py-2.5 text-xs font-semibold text-white"
        >
          <FileText size={20} />
          Offerte
        </Link>
      </div>
    </div>
  );
}
