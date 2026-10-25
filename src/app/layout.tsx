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
import { HeaderV2 } from "@/components/v2/HeaderV2";
import { FooterV2 } from "@/components/v2/FooterV2";
import { localBusinessSchema, websiteSchema } from "@/lib/schema";
import { site } from "@/lib/site";
import { huidigMerk, whatsappUrl } from "@/lib/merk";
import { siteVersie } from "@/lib/site-versie";

// Lettertypen lokaal gehost (latin; OFL, zie fonts/*-OFL.txt): de build hangt zo
// niet af van Google Fonts. Bron: @fontsource-variable/inter,
// @fontsource-variable/space-grotesk, @fontsource-variable/schibsted-grotesk en
// @fontsource/ibm-plex-mono, alle 5.3.0. Inter en Space Grotesk zijn van de oude
// site (v1) en worden daarom niet vooraf geladen.
const sans = localFont({
  src: "./fonts/Inter-latin-wght.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
  preload: false,
});

const display = localFont({
  src: "./fonts/SpaceGrotesk-latin-wght.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "300 700",
  preload: false,
});

const schibsted = localFont({
  src: "./fonts/SchibstedGrotesk-latin-wght.woff2",
  variable: "--font-schibsted",
  display: "swap",
  weight: "400 900",
});

const plex = localFont({
  src: [
    { path: "./fonts/IBMPlexMono-latin-400.woff2", weight: "400" },
    { path: "./fonts/IBMPlexMono-latin-600.woff2", weight: "600" },
  ],
  variable: "--font-plex",
  display: "swap",
});

const merk = huidigMerk();
const ogImages = merk.ogImage ? [{ url: merk.ogImage, width: 1200, height: 630, alt: merk.naam }] : undefined;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.naam} — ${site.tagline}`,
    template: `%s | ${site.naam}`,
  },
  description: site.belofte,
  // favicon.ico zelf: rewrite in next.config.ts naar het bestand van het merk.
  icons: {
    icon: merk.iconen.icon,
    apple: merk.iconen.apple,
  },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    siteName: site.naam,
    title: `${site.naam} — ${site.tagline}`,
    description: site.belofte,
    url: site.url,
    ...(ogImages ? { images: ogImages } : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.naam} — ${site.tagline}`,
    description: site.belofte,
    ...(ogImages ? { images: ogImages } : {}),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (siteVersie() === "v2") {
    return (
      <html
        lang="nl"
        data-site="v2"
        className={`${schibsted.variable} ${plex.variable} h-full`}
        style={{ "--merk-accent": merk.accent, "--merk-accent-donker": merk.accentDonker } as React.CSSProperties}
      >
        <body className="flex min-h-full flex-col bg-v2-bg text-v2-ink">
          <JsonLd data={[localBusinessSchema(), websiteSchema()]} />
          <HeaderV2 merk={{ naam: merk.naam, telefoon: merk.telefoon, logo: merk.logo, whatsappUrl: whatsappUrl(merk) }} />
          {/* pb zolang de cookiebalk er is; de prijsbalk van de intake regelt zijn eigen ruimte */}
          <main className="flex-1 pb-[var(--consent-bar-h,0px)]">{children}</main>
          <FooterV2 />
          <AttributieCapture />
          <Analytics />
          <ConsentBanner />
          <CtaClickTracker />
        </body>
      </html>
    );
  }

  return (
    <html lang="nl" className={`${sans.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <JsonLd data={[localBusinessSchema(), websiteSchema()]} />
        <Header naam={merk.naam} telefoon={{ weergave: site.telefoonWeergave, link: site.telefoonLink }} />
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
