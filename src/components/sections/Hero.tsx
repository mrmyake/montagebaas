import { Clock, ShieldCheck, MapPin, Star } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/lib/site";

const usps = [
  { icon: Clock, text: "Offerte binnen 24 uur" },
  { icon: ShieldCheck, text: "Vaste prijs vooraf" },
  { icon: MapPin, text: "Heel Nederland" },
];

export function Hero({
  titel,
  intro,
  badge = "Specialist in IKEA-keukens",
}: {
  titel?: React.ReactNode;
  intro?: string;
  badge?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      {/* subtiele achtergrond-accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-accent-soft blur-3xl"
      />
      <Container className="relative grid gap-10 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-paper px-3 py-1 text-xs font-semibold text-ink-soft">
            <Star size={13} className="text-accent" /> {badge}
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] text-ink sm:text-5xl lg:text-6xl">
            {titel ?? (
              <>
                Je IKEA-keuken{" "}
                <span className="text-accent">vakkundig geplaatst</span>.
              </>
            )}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            {intro ?? site.belofte}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/offerte" size="lg">
              Bereken je prijs &amp; vraag offerte aan
            </ButtonLink>
            <ButtonLink href="/kosten" size="lg" variant="secondary">
              Wat kost het?
            </ButtonLink>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink-soft">
            {usps.map((u) => (
              <li key={u.text} className="inline-flex items-center gap-2">
                <u.icon size={16} className="text-trust" />
                {u.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Visueel blok — social-proof kaart (placeholder voor echte beelden/reviews) */}
        <div className="relative">
          <div className="rounded-2xl border border-line bg-paper p-6 shadow-card sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={20} className="fill-accent text-accent" />
                ))}
              </div>
              <span className="text-sm font-semibold text-ink">5 van 5 op Werkspot</span>
            </div>
            <p className="mt-4 text-lg font-medium leading-relaxed text-ink">
              &ldquo;Fantastische service door Ilja! Hij heeft een kookeiland voor ons
              geïnstalleerd en het ziet er top uit. Denkt met je mee en gaat voor kwaliteit en een
              tevreden klant.&rdquo;
            </p>
            <p className="mt-3 text-sm text-muted">
              Stephan van den Hoek, Nijkerk — kookeiland geïnstalleerd
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-6 text-center">
              <div>
                <p className="text-2xl font-bold text-ink">24u</p>
                <p className="text-xs text-muted">offerte</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">100%</p>
                <p className="text-xs text-muted">vaste prijs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">NL</p>
                <p className="text-xs text-muted">landelijk</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
