import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileCtaBar } from "@/components/layout/MobileCtaBar";
import { JsonLd } from "@/components/seo/JsonLd";
import { Analytics } from "@/components/analytics/Analytics";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { CtaClickTracker } from "@/components/analytics/CtaClickTracker";
import { localBusinessSchema, websiteSchema } from "@/lib/schema";
import { site } from "@/lib/site";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? site.url;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.naam} — ${site.tagline}`,
    template: `%s | ${site.naam}`,
  },
  description: site.belofte,
  openGraph: {
    type: "website",
    locale: "nl_NL",
    siteName: site.naam,
    title: `${site.naam} — ${site.tagline}`,
    description: site.belofte,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.naam} — ${site.tagline}`,
    description: site.belofte,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${sans.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <JsonLd data={[localBusinessSchema(), websiteSchema()]} />
        <Header />
        {/* pb voor de sticky mobiele CTA-balk zodat content niet verstopt raakt */}
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        <Footer />
        <MobileCtaBar />
        <Analytics />
        <ConsentBanner />
        <CtaClickTracker />
      </body>
    </html>
  );
}
