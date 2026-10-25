import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacyverklaring",
  description:
    `Hoe ${site.naam} omgaat met je persoonsgegevens bij een offerteaanvraag, conform de AVG.`,
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
              <strong> geen volledig adres</strong>.
            </p>
            <p className="mt-2">
              Upload je een tekening, PDF of foto&apos;s van je keukenontwerp, dan bewaren we die
              bestanden in een afgeschermde opslag bij je aanvraag en lezen we ze automatisch uit om
              je een prijsindicatie te geven. Upload alleen wat over je keuken gaat; op een foto kan
              meer te zien zijn dan je bedoelt.
            </p>
            <p className="mt-2">
              Stuur je ons de link naar je ontwerp in de IKEA Keukenplanner, dan halen we via die
              link de artikellijst van je ontwerp op bij IKEA. We bewaren die lijst zoals hij op dat
              moment was bij je aanvraag, zodat we je offerte kunnen maken en later kunnen laten zien
              op welke versie van je ontwerp hij gebaseerd is. Dit kan alles bevatten wat je zelf in
              je ontwerp hebt gezet, zoals de naam van je project.
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

          <div id="cookies" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-ink">Cookies en meting (Google Analytics en Google Ads)</h2>
            <p className="mt-2">
              <strong>In het kort:</strong> accepteer je de cookies, dan delen we gegevens over je
              bezoek met Google, en bij een offerteaanvraag ook een gehashte versie van je
              e-mailadres en telefoonnummer. Weiger je, dan plaatst Google geen cookies en delen we
              geen contactgegevens met Google.
            </p>
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
              <em>ad_storage</em>, <em>ad_user_data</em> en <em>ad_personalization</em>). Ook
              bewaren we dan zelf, in een eigen cookie, via welke advertentie je binnenkwam (zie
              &lsquo;Herkomst van je bezoek&rsquo;).
            </p>
            <p className="mt-2">
              <strong>Weiger je</strong>, dan plaatst Google geen cookies en bewaren we ook zelf
              niet via welke advertentie je binnenkwam. De Google-scripts sturen dan nog wel
              meetsignalen zonder cookies en zonder klik-ID naar Google, waarmee Google bezoeken en
              conversies alleen geaggregeerd schat.
            </p>
            <p className="mt-2">
              Je keuze wijzigen kan altijd via de link &lsquo;Cookie-instellingen&rsquo; onderaan
              elke pagina.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-ink">Herkomst van je bezoek</h2>
            <p className="mt-2">
              Alleen als je de cookies hebt geaccepteerd: kom je via een advertentie of een link met
              campagneparameters binnen, dan bewaren we de klik-ID van die advertentie
              (bijvoorbeeld een <em>gclid</em>) en de campagneparameters in een eigen cookie
              (<em>mb_attributie</em>, maximaal 90 dagen). Accepteer je pas later tijdens hetzelfde
              bezoek (via de cookiebalk of het vinkje bij je aanvraag), dan leggen we op dat moment
              de herkomst vast van de pagina waarop je binnenkwam; tot die keuze onthoudt alleen het
              geopende tabblad die herkomst en slaan we niets op je apparaat op. Deze cookie deelt zelf niets met derden; we gebruiken hem om bij een
              offerteaanvraag vast te leggen via welke advertentie je ons vond, en slaan die
              herkomst samen met je aanvraag op. Weiger je, of heb je nog niet gekozen, dan
              plaatsen we deze cookie niet en bewaren we geen herkomst bij je aanvraag.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-ink">
              Advertentiemeting met je contactgegevens (enhanced conversions)
            </h2>
            <p className="mt-2">
              Alleen als je de cookies hebt geaccepteerd: we melden elke offerteaanvraag aan Google
              Ads, en later ook of die aanvraag een offerte en een opdracht werd, met het bedrag.
              Daarbij sturen we de klik-ID van de advertentie en een SHA-256-gehashte versie van je
              e-mailadres en telefoonnummer mee. Google koppelt die hash aan de advertentieklik, en
              aan een Google-account als dat bij dat adres of nummer hoort. We doen dit om te
              meten welke advertenties daadwerkelijk tot aanvragen en opdrachten leiden. Heb je de
              cookies geweigerd, dan sturen we niets naar Google, ook geen klik-ID.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-ink">Verwerkers</h2>
            <p className="mt-2">
              We gebruiken externe diensten voor hosting en opslag (Vercel, Supabase), e-mail
              (Resend), een pushmelding aan onszelf bij een nieuwe aanvraag (ntfy.sh) en, als je een
              keukentekening uploadt, het automatisch uitlezen daarvan (Anthropic). Voor meting en
              advertenties: Google (Google Analytics 4, Google Ads), zoals hierboven beschreven.
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
