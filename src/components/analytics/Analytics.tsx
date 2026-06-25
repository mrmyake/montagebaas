import Script from "next/script";
import { GtagLoader } from "@/components/analytics/GtagLoader";

/**
 * Env-gated Google Analytics 4 met Google Consent Mode v2 (AVG-compliant).
 * Laadt NIETS zonder NEXT_PUBLIC_GA_ID. De consent-default staat op 'denied'
 * vóór gtag.js laadt; de ConsentBanner upgradet naar 'granted' bij akkoord.
 * gtag.js zelf wordt lui geladen (GtagLoader) zodat het de pagespeed niet raakt.
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const adsId = process.env.NEXT_PUBLIC_ADS_ID;
  if (!gaId) return null;

  const debug = process.env.NODE_ENV === "development";

  return (
    <>
      {/* Consent Mode v2 — DEFAULT denied vóór gtag.js. Definieert window.gtag
          en queue't calls in dataLayer tot GtagLoader het script injecteert. */}
      <Script id="ga-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            region: ['NL', 'EU'],
            wait_for_update: 500,
          });
          gtag('set', 'url_passthrough', true);
          gtag('set', 'ads_data_redaction', true);
          gtag('js', new Date());
          gtag('config', '${gaId}', { send_page_view: true${debug ? ", debug_mode: true" : ""} });
          ${adsId ? `gtag('config', '${adsId}');` : ""}
        `}
      </Script>
      <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="" />
      <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      <GtagLoader />
    </>
  );
}
