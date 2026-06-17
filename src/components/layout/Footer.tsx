import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Container } from "@/components/ui/Container";
import { WhatsappIcon } from "@/components/brand/WhatsappIcon";
import { nav, site, whatsappDefault } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-night text-white/80">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="[&_*]:!text-white">
            <Logo />
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            {site.tagline}. {site.belofte}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Navigatie</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/offerte" className="hover:text-accent">Offerte aanvragen</Link>
            </li>
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-accent">{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Contact</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a href={site.telefoonLink} className="inline-flex items-center gap-2 hover:text-accent">
                <Phone size={15} /> {site.telefoonWeergave}
              </a>
            </li>
            <li>
              <a href={whatsappDefault} className="inline-flex items-center gap-2 hover:text-accent" target="_blank" rel="noopener noreferrer">
                <WhatsappIcon size={15} /> WhatsApp
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="inline-flex items-center gap-2 hover:text-accent">
                <Mail size={15} /> {site.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin size={15} className="mt-0.5 shrink-0" />
              <span>
                {site.straat}, {site.postcode} {site.plaats}
                <br />
                <span className="text-white/60">Werkgebied: heel Nederland</span>
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Bedrijf</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li>{site.naam}</li>
            <li>KvK: {site.kvk}</li>
            <li>
              <Link href="/privacy" className="hover:text-accent">Privacyverklaring</Link>
            </li>
            <li>
              <Link href="/over" className="hover:text-accent">Over ons</Link>
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-2 py-6 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} {site.naam}. Alle rechten voorbehouden.</p>
          <p>Eén vast aanspreekpunt · Gescreende monteurs · Vaste prijs vooraf</p>
        </Container>
      </div>
    </footer>
  );
}
