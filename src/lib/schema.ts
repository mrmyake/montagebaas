import { site } from "@/lib/site";
import type { FaqItem } from "@/components/sections/FaqList";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? site.url;

/**
 * Schema.org / JSON-LD builders.
 *
 * ⚠️ EIGENAAR: vul echte NAW/KvK/telefoon in `site.ts` in. Voeg PAS een AggregateRating toe
 * zodra er echte, verifieerbare reviews zijn — nep-ratings zijn misleidend en SEO-riskant.
 */

export function aggregateRating(opts: {
  ratingValue: number | string;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}) {
  return {
    "@type": "AggregateRating",
    ratingValue: String(opts.ratingValue),
    reviewCount: opts.reviewCount,
    bestRating: String(opts.bestRating ?? 5),
    worstRating: String(opts.worstRating ?? 1),
  };
}

export function review(opts: {
  author: string;
  rating: number;
  body: string;
  datePublished?: string;
}) {
  return {
    "@type": "Review",
    author: { "@type": "Person", name: opts.author },
    reviewRating: {
      "@type": "Rating",
      ratingValue: opts.rating,
      bestRating: 5,
    },
    reviewBody: opts.body,
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
  };
}

export function localBusinessSchema(opts?: {
  areaServed?: string;
  naamSuffix?: string;
  aggregateRating?: ReturnType<typeof aggregateRating>;
  review?: ReturnType<typeof review>[];
}) {
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
      streetAddress: site.straat,
      postalCode: site.postcode,
      addressLocality: site.plaats,
      addressCountry: "NL",
    },
    // identifier: KvK uit site.kvk
    ...(site.kvk
      ? { identifier: { "@type": "PropertyValue", name: "KvK", value: site.kvk } }
      : {}),
    ...(opts?.aggregateRating ? { aggregateRating: opts.aggregateRating } : {}),
    ...(opts?.review && opts.review.length ? { review: opts.review } : {}),
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
