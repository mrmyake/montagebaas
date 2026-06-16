import { site } from "@/lib/site";
import type { FaqItem } from "@/components/sections/FaqList";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? site.url;

/**
 * Schema.org / JSON-LD builders.
 *
 * ⚠️ EIGENAAR: vul echte NAW/KvK/telefoon in `site.ts` in. Voeg PAS een AggregateRating toe
 * zodra er echte, verifieerbare reviews zijn — nep-ratings zijn misleidend en SEO-riskant.
 */

export function localBusinessSchema(opts?: { areaServed?: string; naamSuffix?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": `${siteUrl}/#business`,
    name: opts?.naamSuffix ? `${site.naam} — ${opts.naamSuffix}` : site.naam,
    url: siteUrl,
    description: site.belofte,
    areaServed: opts?.areaServed
      ? { "@type": "City", name: opts.areaServed }
      : { "@type": "Country", name: "Nederland" },
    telephone: site.telefoonLink.replace("tel:", ""),
    email: site.email,
    address: {
      "@type": "PostalAddress",
      addressCountry: "NL",
      addressRegion: site.vestigingsplaats,
    },
    // identifier: KvK — vul in via site.kvk zodra bekend
    ...(site.kvk && site.kvk !== "TODO_EIGENAAR"
      ? { identifier: { "@type": "PropertyValue", name: "KvK", value: site.kvk } }
      : {}),
  };
}

export function serviceSchema(opts?: { areaServed?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Keukenmontage",
    name: "IKEA-keuken laten plaatsen",
    description:
      "Vakkundige montage van IKEA-keukens en andere bouwpakketkeukens, tegen een vaste prijs vooraf.",
    provider: { "@id": `${siteUrl}/#business` },
    areaServed: opts?.areaServed
      ? { "@type": "City", name: opts.areaServed }
      : { "@type": "Country", name: "Nederland" },
  };
}

export function faqPageSchema(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.vraag,
      acceptedAnswer: { "@type": "Answer", text: i.antwoord },
    })),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.naam,
    url: siteUrl,
    inLanguage: "nl-NL",
  };
}

export function breadcrumbSchema(items: { naam: string; pad: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.naam,
      item: `${siteUrl}${it.pad}`,
    })),
  };
}
