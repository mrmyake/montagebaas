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
            <h2 className="text-xl font-bold text-ink">Verwerkers</h2>
            <p className="mt-2">
              We gebruiken externe diensten voor hosting en opslag (Vercel, Supabase) en voor
              e-mail (MailerSend). Met deze partijen zijn verwerkersafspraken van toepassing.
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
