import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /admin heeft geen eigen index en /admin/lead (enkelvoud) is een voor de hand
  // liggende tikfout — beide gaven een 404 na het inloggen.
  async redirects() {
    return [
      { source: "/admin", destination: "/admin/leads", permanent: false },
      { source: "/admin/lead", destination: "/admin/leads", permanent: false },
    ];
  },
};

export default nextConfig;
