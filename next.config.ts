import type { NextConfig } from "next";
import { merkVoorId } from "./src/lib/merk/index.ts";

const nextConfig: NextConfig = {
  // /admin heeft geen eigen index en /admin/lead (enkelvoud) is een voor de hand
  // liggende tikfout — beide gaven een 404 na het inloggen.
  async redirects() {
    return [
      { source: "/admin", destination: "/admin/leads", permanent: false },
      { source: "/admin/lead", destination: "/admin/leads", permanent: false },
    ];
  },
  // Browsers vragen /favicon.ico ook zonder <link>; dat bestand hoort bij het
  // actieve merk (env MERK, bij de build gelezen).
  async rewrites() {
    return [{ source: "/favicon.ico", destination: merkVoorId(process.env.MERK).iconen.favicon }];
  },
};

export default nextConfig;
