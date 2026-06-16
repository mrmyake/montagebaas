import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { steden } from "@/lib/steden";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? site.url;

export default function sitemap(): MetadataRoute.Sitemap {
  const statisch: { pad: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { pad: "/", priority: 1.0, changeFrequency: "weekly" },
    { pad: "/offerte", priority: 0.9, changeFrequency: "monthly" },
    { pad: "/kosten", priority: 0.8, changeFrequency: "monthly" },
    { pad: "/werkwijze", priority: 0.6, changeFrequency: "monthly" },
    { pad: "/werkgebied", priority: 0.6, changeFrequency: "monthly" },
    { pad: "/veelgestelde-vragen", priority: 0.6, changeFrequency: "monthly" },
    { pad: "/reviews", priority: 0.5, changeFrequency: "monthly" },
    { pad: "/over", priority: 0.5, changeFrequency: "yearly" },
    { pad: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  ];

  const stadPaginas = steden.map((s) => ({
    pad: `/keukenmonteur/${s.slug}`,
    priority: 0.7,
    changeFrequency: "monthly" as const,
  }));

  return [...statisch, ...stadPaginas].map((r) => ({
    url: `${siteUrl}${r.pad}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
