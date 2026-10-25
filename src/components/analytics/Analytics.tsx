import { GtagLoader } from "@/components/analytics/GtagLoader";

/**
 * Env-gated Google Analytics 4 met Google Consent Mode v2 (AVG-compliant).
 * Laadt NIETS zonder NEXT_PUBLIC_GA_ID. De consent-default staat op 'denied'
 * vóór gtag.js laadt; de ConsentBanner upgradet naar 'granted' bij akkoord.
 * gtag.js zelf wordt lui geladen (GtagLoader) zodat het de pagespeed niet raakt.
 *
 * Twee delen: AnalyticsHead (inline script in <head>) en Analytics (body).
 */

/**
 * Definieert window.gtag en zet de consent-default, vóór alle Next-code.
 *
 * Bewust een gewone inline <script> in <head> en geen next/script met
 * beforeInteractive: dat zette het script client-side alsnog in <head> vlak vóór
 * de hydration, waarna React een onverwacht element in <head> vond, fout #418
 * gooide en de hele pagina opnieuw in de browser renderde (25-10-2026).
 */
export function AnalyticsHead() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const adsId = process.env.NEXT_PUBLIC_ADS_ID;
  if (!gaId) return null;

  // Buiten productie (previews, lokaal) niets naar Google: anders tellen testaanvragen
  // als conversie in GA4 en, via de import, in Google Ads. Wel een shim, zodat
  // events controleerbaar in window.dataLayer belanden (Fase 4-controle).
  if (process.env.VERCEL_ENV !== "production") {
    return (
      <script
        id="ga-uit"
        dangerouslySetInnerHTML={{
          __html: `
          window.dataLayer = window.dataLayer || [];
          window.gtag = function(){ window.dataLayer.push(arguments); };
          window.__mbGaUit = true;
        `,
        }}
      />
    );
  }

  const debug = process.env.NODE_ENV === "development";

  // Consent Mode v2 — DEFAULT denied vóór gtag.js. Definieert window.gtag
  // en queue't calls in dataLayer tot GtagLoader het script injecteert.
  return (
    <script
      id="ga-consent-default"
      dangerouslySetInnerHTML={{
        __html: `
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
        `,
      }}
    />
  );
}

export function Analytics() {
  if (!process.env.NEXT_PUBLIC_GA_ID || process.env.VERCEL_ENV !== "production") return null;

  return (
    <>
      <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="" />
      <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      <GtagLoader />
    </>
  );
}
