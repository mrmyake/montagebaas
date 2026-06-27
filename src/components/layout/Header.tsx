"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { nav, site } from "@/lib/site";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Hoofdmenu">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={site.telefoonLink}
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-accent"
          >
            <Phone size={16} />
            <span>{site.telefoonWeergave}</span>
          </a>
          <ButtonLink href="/offerte">Bereken je prijs</ButtonLink>
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-xl text-ink lg:hidden"
          aria-label={open ? "Menu sluiten" : "Menu openen"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </Container>

      {open && (
        <div className="border-t border-line bg-surface lg:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-paper"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-3">
              <ButtonLink href="/offerte" size="lg" onClick={() => setOpen(false)}>
                Bereken je prijs
              </ButtonLink>
              <a
                href={site.telefoonLink}
                className="inline-flex items-center justify-center gap-2 text-base font-semibold text-ink"
              >
                <Phone size={18} />
                {site.telefoonWeergave}
              </a>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
