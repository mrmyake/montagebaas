import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileCtaBar } from "@/components/layout/MobileCtaBar";
import { JsonLd } from "@/components/seo/JsonLd";
import { Analytics } from "@/components/analytics/Analytics";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { CtaClickTracker } from "@/components/analytics/CtaClickTracker";
import { AttributieCapture } from "@/components/analytics/AttributieCapture";
import { localBusinessSchema, websiteSchema } from "@/lib/schema";
import { site } from "@/lib/site";

// Lettertypen lokaal gehost (variabel, latin; OFL, zie fonts/*-OFL.txt): de build
// hangt zo niet af van Google Fonts. Bron: @fontsource-variable/inter en
// @fontsource-variable/space-grotesk, beide 5.3.0.
const sans = localFont({
  src: "./fonts/Inter-latin-wght.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});

const display = localFont({
  src: "./fonts/SpaceGrotesk-latin-wght.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "300 700",
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
        {/* pb voor de sticky mobiele CTA-balk (en de cookiebalk zolang die er is) zodat content niet verstopt raakt */}
        <main className="flex-1 pb-[calc(5rem+var(--consent-bar-h,0px))] lg:pb-[var(--consent-bar-h,0px)]">{children}</main>
        <Footer />
        <MobileCtaBar />
        {/* Vóór Analytics: werkt los van gtag.js en moet ook draaien als dat geblokkeerd is. */}
        <AttributieCapture />
        <Analytics />
        <ConsentBanner />
        <CtaClickTracker />
      </body>
    </html>
  );
}
