"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  CheckCard,
  Field,
  OptionCard,
  ProgressBar,
  StepHeading,
  Stepper,
  inputClass,
} from "@/components/configurator/parts";
import {
  extraOpties,
  gewensteePeriodeOpties,
  grootteOpties,
  isGeldigePostcode,
  opstellingOpties,
  typeKlusOpties,
  type TypeKlus,
} from "@/lib/configurator";
import { berekenPrijs, euro, type Extras, type Grootte, type Opstelling } from "@/lib/pricing";
import { verstuurAanvraag } from "@/app/offerte/actions";

const TOTAAL = 6;

export function Configurator() {
  const router = useRouter();
  const [stap, setStap] = useState(1);

  const [typeKlus, setTypeKlus] = useState<TypeKlus | null>(null);
  const [grootte, setGrootte] = useState<Grootte | null>(null);
  const [opstelling, setOpstelling] = useState<Opstelling | null>(null);
  const [extras, setExtras] = useState<Extras>({ apparaat_aantal: 1 });
  const [postcode, setPostcode] = useState("");

  const [naam, setNaam] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [email, setEmail] = useState("");
  const [periode, setPeriode] = useState<string>(gewensteePeriodeOpties[0].value);
  const [toelichting, setToelichting] = useState("");

  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const range = useMemo(() => {
    if (!grootte || !opstelling) return null;
    return berekenPrijs({ grootte, opstelling, extras });
  }, [grootte, opstelling, extras]);

  const stapGeldig = useMemo(() => {
    switch (stap) {
      case 1:
        return !!typeKlus;
      case 2:
        return !!grootte && !!opstelling;
      case 3:
        return true; // extra's optioneel
      case 4:
        return isGeldigePostcode(postcode);
      case 5:
        return true;
      case 6:
        return (
          naam.trim().length > 1 &&
          telefoon.trim().length >= 8 &&
          /^\S+@\S+\.\S+$/.test(email.trim())
        );
      default:
        return false;
    }
  }, [stap, typeKlus, grootte, opstelling, postcode, naam, telefoon, email]);

  const toggleExtra = (key: keyof Extras) =>
    setExtras((e) => ({ ...e, [key]: !e[key] }));

  const volgende = () => {
    if (!stapGeldig) return;
    setFout(null);
    setStap((s) => Math.min(TOTAAL, s + 1));
  };
  const vorige = () => {
    setFout(null);
    setStap((s) => Math.max(1, s - 1));
  };

  async function verstuur() {
    if (!typeKlus || !grootte || !opstelling) return;
    setBezig(true);
    setFout(null);
    const res = await verstuurAanvraag({
      type_klus: typeKlus,
      grootte,
      opstelling,
      extras,
      postcode,
      naam,
      telefoon,
      email,
      gewenste_periode: periode,
      toelichting,
    });
    if (res.ok) {
      router.push("/bedankt");
    } else {
      setFout(res.error);
      setBezig(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-5 shadow-card sm:p-8">
      <ProgressBar stap={stap} totaal={TOTAAL} />

      {/* STAP 1 — Type klus */}
      {stap === 1 && (
        <div>
          <StepHeading stap={1} totaal={TOTAAL} titel="Wat voor klus is het?" />
          <div className="grid gap-3">
            {typeKlusOpties.map((o) => (
              <OptionCard
                key={o.value}
                selected={typeKlus === o.value}
                onSelect={() => setTypeKlus(o.value)}
                label={o.label}
                sub={o.sub}
              />
            ))}
          </div>
        </div>
      )}

      {/* STAP 2 — Grootte + opstelling */}
      {stap === 2 && (
        <div className="space-y-8">
          <div>
            <StepHeading stap={2} totaal={TOTAAL} titel="Hoe groot is je keuken?" sub="Tel onder- en bovenkasten samen." />
            <div className="grid gap-3">
              {grootteOpties.map((o) => (
                <OptionCard
                  key={o.value}
                  selected={grootte === o.value}
                  onSelect={() => setGrootte(o.value)}
                  label={o.label}
                  sub={o.sub}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-lg font-bold text-ink">Welke opstelling?</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {opstellingOpties.map((o) => (
                <OptionCard
                  key={o.value}
                  selected={opstelling === o.value}
                  onSelect={() => setOpstelling(o.value)}
                  label={o.label}
                  sub={o.sub}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STAP 3 — Extra's */}
      {stap === 3 && (
        <div>
          <StepHeading
            stap={3}
            totaal={TOTAAL}
            titel="Wil je er nog iets bij?"
            sub="Kies wat van toepassing is. Overslaan kan ook."
          />
          <div className="grid gap-3">
            {extraOpties.map((o) => (
              <div key={o.key}>
                <CheckCard
                  checked={!!extras[o.key]}
                  onToggle={() => toggleExtra(o.key)}
                  label={o.label}
                  sub={o.sub}
                  prijs={o.prijs}
                  perStuk={o.perStuk}
                />
                {o.key === "apparaat_aansluiten" && extras.apparaat_aansluiten && (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-accent-soft px-4 py-3">
                    <span className="text-sm font-medium text-ink">Hoeveel apparaten?</span>
                    <Stepper
                      value={extras.apparaat_aantal ?? 1}
                      onChange={(v) => setExtras((e) => ({ ...e, apparaat_aantal: v }))}
                    />
                  </div>
                )}
              </div>
            ))}
            <div className="rounded-xl border border-dashed border-line-strong bg-surface p-4 text-sm text-muted">
              <strong className="text-ink-soft">Tegelwerk / spatwand?</strong> Dat doen we op
              aanvraag (maatwerk). Vermeld het in je toelichting, dan nemen we het mee in de offerte.
            </div>
          </div>
        </div>
      )}

      {/* STAP 4 — Locatie */}
      {stap === 4 && (
        <div>
          <StepHeading
            stap={4}
            totaal={TOTAAL}
            titel="Waar moet de keuken komen?"
            sub="Alleen je postcode — geen volledig adres nodig."
          />
          <div className="max-w-xs">
            <Field label="Postcode">
              <input
                className={inputClass}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="1234 AB"
                autoComplete="postal-code"
                inputMode="text"
              />
            </Field>
            {postcode && !isGeldigePostcode(postcode) && (
              <p className="mt-2 text-sm text-accent">Vul een geldige postcode in (bv. 1234 AB).</p>
            )}
          </div>
        </div>
      )}

      {/* STAP 5 — Prijsindicatie */}
      {stap === 5 && range && (
        <div>
          <StepHeading stap={5} totaal={TOTAAL} titel="Jouw prijsindicatie" />
          <div className="rounded-2xl border border-accent/30 bg-accent-soft p-6 text-center sm:p-8">
            <p className="text-sm font-semibold text-accent">Geschatte montagekosten</p>
            <p className="mt-2 text-4xl font-bold text-ink sm:text-5xl">
              {euro(range.min)} <span className="text-muted">–</span> {euro(range.max)}
            </p>
            <p className="mt-3 text-sm text-ink-soft">inclusief montage</p>
          </div>
          <p className="mt-4 text-sm text-muted">
            Dit is een indicatie. Je ontvangt binnen 24 uur een exacte offerte op maat — vaste
            prijs, geen verrassingen.
          </p>
        </div>
      )}

      {/* STAP 6 — Aanvraag */}
      {stap === 6 && (
        <div>
          <StepHeading
            stap={6}
            totaal={TOTAAL}
            titel="Vraag je offerte aan"
            sub="We bellen of mailen je binnen 24 uur met een exacte offerte."
          />
          {range && (
            <div className="mb-6 flex items-center justify-between rounded-xl bg-paper px-4 py-3 ring-1 ring-line">
              <span className="text-sm text-ink-soft">Jouw indicatie</span>
              <span className="font-bold text-ink">{euro(range.min)} – {euro(range.max)}</span>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Naam">
              <input className={inputClass} value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Voor- en achternaam" autoComplete="name" />
            </Field>
            <Field label="Telefoon">
              <input className={inputClass} value={telefoon} onChange={(e) => setTelefoon(e.target.value)} placeholder="06 - 12 34 56 78" autoComplete="tel" inputMode="tel" />
            </Field>
            <Field label="E-mail">
              <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jij@voorbeeld.nl" autoComplete="email" inputMode="email" type="email" />
            </Field>
            <Field label="Wanneer wil je het laten doen?">
              <select className={inputClass} value={periode} onChange={(e) => setPeriode(e.target.value)}>
                {gewensteePeriodeOpties.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Toelichting" optional>
                <textarea className={inputClass} value={toelichting} onChange={(e) => setToelichting(e.target.value)} rows={3} placeholder="Bijzonderheden, tegelwerk, planning, etc." />
              </Field>
            </div>
          </div>

          {fout && (
            <p className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">{fout}</p>
          )}

          <p className="mt-5 flex items-center gap-2 text-sm text-muted">
            <ShieldCheck size={16} className="text-trust" />
            Je gegevens gebruiken we alleen voor je offerte. Geen foto&apos;s nodig.
          </p>
        </div>
      )}

      {/* Navigatie */}
      <div className="mt-8 flex items-center justify-between gap-3">
        {stap > 1 ? (
          <Button variant="ghost" onClick={vorige} type="button">
            <ArrowLeft size={18} /> Vorige
          </Button>
        ) : (
          <span />
        )}

        {stap < TOTAAL && (
          <Button onClick={volgende} disabled={!stapGeldig} type="button" size="lg" className="min-w-40">
            {stap === 5 ? "Naar aanvraag" : "Volgende"} <ArrowRight size={18} />
          </Button>
        )}
        {stap === TOTAAL && (
          <Button onClick={verstuur} disabled={!stapGeldig || bezig} type="button" size="lg" className="min-w-52">
            {bezig ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Versturen…
              </>
            ) : (
              "Vraag mijn offerte aan"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
