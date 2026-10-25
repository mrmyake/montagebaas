"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Woordmerk } from "@/components/merk/Beeldmerk";
import { huidigMerk, whatsappUrl } from "@/lib/merk";

export const NAV_V2 = [
  { label: "Kosten", href: "/kosten" },
  { label: "Vergelijk", href: "/#vergelijk" },
  { label: "Werkwijze", href: "/werkwijze" },
  { label: "Reviews", href: "/reviews" },
  { label: "Werkgebied", href: "/werkgebied" },
  { label: "Vragen", href: "/veelgestelde-vragen" },
  { label: "Over ons", href: "/over" },
] as const;

function WhatsappLijn() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M9 9.5c.3 2 1.8 3.8 4 4.5l1.2-1.2 1.8.8-.4 1.6c-3.4.2-6.6-3-6.4-6.4l1.6-.4.8 1.8z" fill="currentColor" />
    </svg>
  );
}

function Telefoon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Header van de redesign. Desktop: menu, telefoonnummer en "Bereken je prijs".
 * Mobiel (mockup): woordmerk links, WhatsApp- en belknop rechts. Buiten de
 * homepage komt daar een menuknop bij, anders zijn de andere pagina's op een
 * telefoon niet te vinden.
 */
export function HeaderV2() {
  const merk = huidigMerk();
  const thuis = usePathname() === "/";
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-v2-line bg-white">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between gap-5 pl-4 pr-3 sm:h-auto sm:px-[clamp(16px,4vw,40px)] sm:py-3">
        <Link href="/" className="text-v2-ink no-underline" aria-label={`${merk.naam}, naar de homepage`}>
          <Woordmerk naam={merk.naam} />
        </Link>

        <nav aria-label="Hoofdmenu" className="hidden items-center gap-6 text-[15px] font-medium min-[901px]:flex">
          {NAV_V2.map((n) => (
            <Link key={n.href} href={n.href} className="text-v2-ink no-underline hover:text-merk-donker">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3.5 sm:flex">
          <a href={merk.telefoon.link} className="inline-flex min-h-11 items-center text-[15px] font-bold text-v2-ink no-underline">
            {merk.telefoon.weergave}
          </a>
          <Link
            href="/#offerte"
            className="inline-flex min-h-11 items-center rounded-lg bg-merk px-[18px] font-bold text-white no-underline hover:bg-merk-donker"
          >
            Bereken je prijs
          </Link>
        </div>

        <div className="flex gap-1 sm:hidden">
          <a
            href={whatsappUrl(merk)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Stuur een WhatsApp"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-v2-ink"
          >
            <WhatsappLijn />
          </a>
          <a
            href={merk.telefoon.link}
            aria-label={`Bel ${merk.telefoon.weergave}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-v2-ink text-white"
          >
            <Telefoon />
          </a>
          {!thuis && (
            <button
              type="button"
              aria-label={open ? "Menu sluiten" : "Menu openen"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-v2-ink"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
        </div>
      </div>

      {open && !thuis && (
        <nav aria-label="Menu" className="border-t border-v2-line bg-white px-4 pb-4 sm:hidden">
          <ul className="flex flex-col">
            {NAV_V2.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center font-semibold text-v2-ink no-underline">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/#offerte"
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-12 items-center justify-center rounded-lg bg-merk font-bold text-white no-underline"
          >
            Bereken je prijs
          </Link>
        </nav>
      )}
    </header>
  );
}
