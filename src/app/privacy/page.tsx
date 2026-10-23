import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacyverklaring",
  description:
    "Hoe Montagebaas omgaat met je persoonsgegevens bij een offerteaanvraag, conform de AVG.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy"
        titel="Privacyverklaring"
        intro="We gaan zorgvuldig om met je gegevens. Hieronder lees je welke gegevens we verzamelen, waarom, en wat je rechten zijn."
      />
      <section className="py-12 sm:py-16">
        <Container className="max-w-3xl space-y-8 text-ink-soft">
          {/* ⚠️ EIGENAAR: laat deze tekst juridisch controleren en vul bedrijfsgegevens in. */}
          <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink">
            Let op (voor eigenaar): controleer deze tekst juridisch en vul de bedrijfsgegevens
            (KvK, adres, contact) in voordat de site live gaat.
          </p>

          <div>
            <h2 className="text-xl font-bold text-ink">Wie zijn wij?</h2>
            <p className="mt-2">
              {site.naam} (KvK {site.kvk}) is verantwoordelijk voor de verwerking van
              persoonsgegevens zoals beschreven in deze verklaring. Contact:{" "}
              <a className="text-accent underline" href={`mailto:${site.email}`}>{site.email}</a>.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-ink">Welke gegevens verzamelen we?</h2>
            <p className="mt-2">
              Wanneer je een offerte aanvraagt, verwerken we: je naam, telefoonnummer, e-mailadres,
              postcode, de gegevens over je keukenklus (type, grootte, opstelling, gekozen
              extra&apos;s en gewenste periode) en een eventuele toelichting. We vragen
              <strong> geen volledig adres en geen foto&apos;s</strong>.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-ink">Waarvoor gebruiken we ze?</h2>
            <p className="mt-2">
              Uitsluitend om je aanvraag te behandelen: een offerte opstellen, contact met je
              opnemen en de montage door een geselecteerde monteur laten uitvoeren. We delen
              alleen de noodzakelijke gegevens met de monteur die jouw klus uitvoert.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-ink">Hoe lang bewaren we ze?</h2>
            <p className="mt-2">
              We bewaren je gegevens niet langer dan nodig voor de afhandeling van je aanvraag en de
              wettelijke bewaartermijnen. {/* EIGENAAR: specificeer concrete termijn. */}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-ink">Cookies en meting (Google Analytics en Google Ads)</h2>
            <p className="mt-2">
              We gebruiken Google Analytics 4 om het siteverkeer te meten en Google Ads om te zien
              welke advertenties tot een aanvraag leiden. Beide laden via Google Consent Mode: alle
              toestemmingssignalen staan standaard op &lsquo;geweigerd&rsquo; totdat je in de
              cookiebanner een keuze maakt. Je keuze bewaren we in je browser.
            </p>
            <p className="mt-2">
              <strong>Accepteer je</strong>, dan plaatst Google analytics- en advertentiecookies en
              delen we gegevens over je bezoek met Google voor advertentiemeting en
              gepersonaliseerde advertenties (de signalen <em>analytics_storage</em>,{" "}
              <em>ad_storage</em>, <em>ad_user_data</em> en <em>ad_personalization</em>).
            </p>
            <p className="mt-2">
              <strong>Weiger je</strong>, dan plaatst Google geen cookies. De Google-scripts sturen
              dan nog wel cookieloze, niet tot een persoon herleidbare meetsignalen (zonder
              advertentieklik-ID) naar Google, waarmee Google bezoeken en conversies alleen
              geaggregeerd schat.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-ink">Herkomst van je bezoek</h2>
            <p className="mt-2">
              Kom je via een advertentie of een link met campagneparameters binnen, dan bewaren
              we de klik-ID van die advertentie (bijvoorbeeld een <em>gclid</em>) en de
              campagneparameters in een eigen cookie (<em>mb_attributie</em>, maximaal 90 dagen),
              los van je cookiekeuze. Deze cookie deelt niets met derden; we gebruiken hem alleen
              om bij een offerteaanvraag vast te leggen via welke advertentie je ons vond.
              Die herkomst slaan we samen met je aanvraag op.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-ink">
              Advertentiemeting met je contactgegevens (enhanced conversions)
            </h2>
            <p className="mt-2">
              Alleen als je de cookies hebt geaccepteerd: wordt een aanvraag een offerte of een
              opdracht, dan melden we dat aan Google Ads, samen met de klik-ID van de advertentie
              en een versleutelde (SHA-256-gehashte) versie van je e-mailadres en telefoonnummer.
              Google gebruikt die hash om de conversie aan de advertentieklik te koppelen en
              verwijdert hem daarna; Google kan er je e-mailadres of nummer niet uit herleiden.
              We doen dit om te meten welke advertenties daadwerkelijk tot opdrachten leiden.
              Heb je de cookies geweigerd, dan sturen we niets naar Google, ook geen klik-ID.
            </p>
            <p className="mt-2">
              Je kunt je cookiekeuze wijzigen door de opgeslagen sitegegevens van {site.naam} in
              je browser te wissen; de banner verschijnt dan opnieuw.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-ink">Verwerkers</h2>
            <p className="mt-2">
              We gebruiken externe diensten voor hosting en opslag (Vercel, Supabase), e-mail
              (Resend), een pushmelding aan onszelf bij een nieuwe aanvraag (ntfy.sh) en, als je een
              keukentekening uploadt, het automatisch uitlezen daarvan (Anthropic). Voor meting en
              advertenties: Google (Google Analytics 4, Google Ads), zoals hierboven beschreven.
              Met deze partijen zijn verwerkersafspraken van toepassing.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-ink">Je rechten</h2>
            <p className="mt-2">
              Je hebt het recht om je gegevens in te zien, te corrigeren of te laten verwijderen.
              Stuur daarvoor een e-mail naar{" "}
              <a className="text-accent underline" href={`mailto:${site.email}`}>{site.email}</a>.
              Ook kun je een klacht indienen bij de Autoriteit Persoonsgegevens.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
