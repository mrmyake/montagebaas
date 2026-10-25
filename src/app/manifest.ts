import type { MetadataRoute } from "next";
import { huidigMerk } from "@/lib/merk";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  const merk = huidigMerk();
  return {
    name: merk.naam,
    short_name: merk.naam,
    description: site.belofte,
    start_url: "/",
    display: "browser",
    background_color: "#FFFFFF",
    theme_color: merk.accent,
    icons: merk.iconen.manifest.map((i) => ({ src: i.url, sizes: i.sizes, type: i.type })),
  };
}
