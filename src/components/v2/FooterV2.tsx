import Link from "next/link";
import { CookieInstellingenLink } from "@/components/analytics/CookieInstellingenLink";
import { huidigMerk } from "@/lib/merk";

const LINKS = [
  { label: "Kosten", href: "/kosten" },
  { label: "Werkwijze", href: "/werkwijze" },
  { label: "Reviews", href: "/reviews" },
  { label: "Werkgebied", href: "/werkgebied" },
  { label: "Vragen", href: "/veelgestelde-vragen" },
  { label: "Over ons", href: "/over" },
  { label: "Privacy", href: "/privacy" },
];

export function FooterV2() {
  const merk = huidigMerk();
  return (
    <footer id="over" className="bg-v2-footer text-[15px]">
      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-6 px-[clamp(16px,4vw,40px)] py-10">
        <div className="min-w-0 flex-[1_1_280px]">
          <p className="m-0 text-[19px] font-extrabold">{merk.naam}</p>
          <p className="mt-1.5 max-w-[28em] text-v2-footer-ink">
            IKEA-keukens geplaatst voor een vaste prijs, tot ongeveer {merk.werkgebied.straalKm} km rond{" "}
            {merk.werkgebied.centrum}. {merk.naam} is geen onderdeel van IKEA.
          </p>
          <p className="mt-3 text-v2-footer-ink">
            {merk.adres.straat}, {merk.adres.postcode} {merk.adres.plaats} · KvK {merk.kvk}
          </p>
          <p className="mt-1 text-v2-footer-ink">
            <a href={merk.telefoon.link} className="font-semibold text-v2-ink">
              {merk.telefoon.weergave}
            </a>{" "}
            ·{" "}
            <a href={`mailto:${merk.email}`} className="font-semibold text-v2-ink">
              {merk.email}
            </a>
          </p>
        </div>
        <nav aria-label="Voettekst" className="flex flex-wrap items-start gap-x-6 gap-y-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-9 items-center text-v2-ink no-underline hover:underline">
              {l.label}
            </Link>
          ))}
          <CookieInstellingenLink className="inline-flex min-h-9 cursor-pointer items-center border-0 bg-transparent p-0 font-[inherit] text-v2-ink hover:underline" />
        </nav>
      </div>
    </footer>
  );
}
