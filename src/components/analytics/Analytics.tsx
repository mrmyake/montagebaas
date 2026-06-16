import Script from "next/script";

/**
 * Env-gated Google Analytics 4 / Google Ads loader.
 * Laadt NIETS zonder een geldig NEXT_PUBLIC_GA_ID — zo blijft de site privacy-vriendelijk
 * en snel tot de eigenaar tracking inschakelt.
 *
 * ⚠️ EIGENAAR / AVG: voeg cookie-/consenttoestemming toe vóór je tracking activeert,
 * en vermeld de tracking in de privacyverklaring.
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
