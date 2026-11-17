import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { stedenBinnenStraal } from "@/lib/steden";

const siteUrl = site.url;

/**
 * Laatste inhoudelijke wijziging per soort pagina (ISO-datum). Bewust handmatig: een
 * lastmod die bij elke build verspringt (new Date()) leert Google de datum te negeren.
 * Zet de datum op de dag dat de tekst van die pagina(s) echt veranderde.
 */
const LASTMOD = {
  home: "2026-11-17",
  offerte: "2026-10-25",
  kosten: "2026-10-25",
  werkwijze: "2026-10-25",
  werkgebied: "2026-11-17",
  vragen: "2026-10-25",
  reviews: "2026-10-25",
  over: "2026-10-25",
  privacy: "2026-10-25",
  steden: "2026-10-25",
} as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const statisch: { pad: string; lastModified: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { pad: "/", lastModified: LASTMOD.home, priority: 1.0, changeFrequency: "weekly" },
    { pad: "/offerte", lastModified: LASTMOD.offerte, priority: 0.9, changeFrequency: "monthly" },
    { pad: "/kosten", lastModified: LASTMOD.kosten, priority: 0.8, changeFrequency: "monthly" },
    { pad: "/werkwijze", lastModified: LASTMOD.werkwijze, priority: 0.6, changeFrequency: "monthly" },
    { pad: "/werkgebied", lastModified: LASTMOD.werkgebied, priority: 0.6, changeFrequency: "monthly" },
    { pad: "/veelgestelde-vragen", lastModified: LASTMOD.vragen, priority: 0.6, changeFrequency: "monthly" },
    { pad: "/reviews", lastModified: LASTMOD.reviews, priority: 0.5, changeFrequency: "monthly" },
    { pad: "/over", lastModified: LASTMOD.over, priority: 0.5, changeFrequency: "yearly" },
    { pad: "/privacy", lastModified: LASTMOD.privacy, priority: 0.2, changeFrequency: "yearly" },
  ];

  // Plaatsen buiten het werkgebied staan op noindex en horen dus niet in de sitemap.
  const stadPaginas = stedenBinnenStraal.map((s) => ({
    pad: `/keukenmonteur/${s.slug}`,
    lastModified: LASTMOD.steden,
    priority: 0.7,
    changeFrequency: "monthly" as const,
  }));

  return [...statisch, ...stadPaginas].map((r) => ({
    url: `${siteUrl}${r.pad}`,
    lastModified: r.lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
