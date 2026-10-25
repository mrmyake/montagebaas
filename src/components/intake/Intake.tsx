"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bon } from "@/components/intake/Bon";
import { KeuzeKaart, Melding, PakketKaart, StapKop, Veld, VinkKaart, invoerKlasse, postcodeKlasse } from "@/components/intake/ui";
import { ConsentCheckbox } from "@/components/analytics/ConsentCheckbox";
import { INVOERMETHODE_KEY, OFFERTE_VERZONDEN_KEY, SITE_VERSIE_KEY } from "@/components/analytics/ConversionTracker";
import { stuurStapEenmalig, stuurTrechterEvent } from "@/lib/ga-events";
import { verstuurVragenAanvraag } from "@/components/intake/actions";
import { CONSENT_CHANGED_EVENT, bewaarConsentKeuze, huidigeConsentKeuze, type ConsentBron } from "@/lib/consent";
import { parsePlannerLink } from "@/lib/ikea-planner/link";
import { bouwBon, type Route } from "@/lib/intake/bon";
import {
  GROOTTE_OPTIES,
  KLUS_OPTIES,
  OPSTELLING_OPTIES,
  PAKKET_OPTIES,
  PERIODE_OPTIES,
  isGeldigeEmail,
  isGeldigeNaam,
  isGeldigePostcode,
  isGeldigeTelefoon,
  type Periode,
} from "@/lib/intake/velden";
import {
  extraOpties,
  euro,
  extraLabel,
  ontwerpBand,
  toonBedrag,
  type ExtraKey,
  type Grootte,
  type LinkPrijzen,
  type Opstelling,
  type Pakket,
  type Prijsbron,
  type TypeKlus,
} from "@/lib/prijs-weergave";
import type { OntwerpLezenAntwoord } from "@/app/api/ontwerp-lezen/route";

type Gelezen = Extract<OntwerpLezenAntwoord, { ok: true }>;

const MAX_BYTES = 8 * 1024 * 1024; // zelfde regels als lib/aanvraag-intake.ts
const MAX_BESTANDEN = 8;
const TYPES = ["application/pdf", "image/png", "image/jpeg"];

const ROUTES: { id: Route; label: string; kort: string; sub: string }[] = [
  { id: "link", label: "IKEA-link plakken", kort: "Link", sub: "Snelst, direct je prijs" },
  { id: "pdf", label: "PDF uploaden", kort: "PDF", sub: "Export uit de Keukenplanner" },
  { id: "vragen", label: "Vragen beantwoorden", kort: "Vragen", sub: "Nog geen ontwerp of geen IKEA" },
];

const STAPPEN_ONTWERP = ["Ontwerp", "Pakket", "Waar en wanneer", "Gegevens"];
const STAPPEN_VRAGEN = ["Klus", "Keuken", "Extra's", "Waar en wanneer", "Gegevens"];

function Check({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M5 12l5 5 9-10" fill="none" stroke="var(--merk-accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface IntakeProps {
  merknaam: string;
  telefoon: { weergave: string; link: string };
  whatsappUrl: string;
  reviewSamenvatting: string;
  /** Bedragen uit de actieve tarievenrij, server-side geladen. */
  bron: Prijsbron;
}

/**
 * De configurator van de redesign (docs/design/PrijsEerstLink*.dc.html).
 *
 * Drie routes: IKEA-link (gelezen via /api/ontwerp-lezen vóór het verzenden),
 * PDF (asynchroon: pas bij verzenden naar Storage, met een band uit grootte en
 * pakket) en vragen. Ingevulde gegevens blijven staan bij wisselen van route.
 * Na verzenden altijd naar /bedankt, waar de GA4-conversie vuurt.
 */
export function Intake({ merknaam, telefoon, whatsappUrl, reviewSamenvatting, bron }: IntakeProps) {
  const router = useRouter();
  const kaartRef = useRef<HTMLDivElement>(null);
  const bestandRef = useRef<HTMLInputElement>(null);

  const [route, setRoute] = useState<Route>("link");
  const [dstap, setDstap] = useState(1);
  const [vstap, setVstap] = useState(1);

  const [plannerTekst, setPlannerTekst] = useState("");
  const [lezen, setLezen] = useState<{ status: "rust" | "bezig" | "fout"; melding?: string }>({ status: "rust" });
  const [gelezen, setGelezen] = useState<Gelezen | null>(null);
  const [bestanden, setBestanden] = useState<File[]>([]);
  const [bestandFout, setBestandFout] = useState<string | null>(null);
  const [sleep, setSleep] = useState(false);

  const [pakket, setPakket] = useState<Pakket>("compleet");
  const [demontage, setDemontage] = useState(false);
  const [klus, setKlus] = useState<TypeKlus>("complete_ikea_keuken");
  const [grootte, setGrootte] = useState<Grootte | null>(null);
  const [opstelling, setOpstelling] = useState<Opstelling | null>(null);
  const [extras, setExtras] = useState<Partial<Record<ExtraKey, boolean>>>({});
  const [postcode, setPostcode] = useState("");
  const [postcodeGeraakt, setPostcodeGeraakt] = useState(false);
  const [periode, setPeriode] = useState<Periode>("zo_snel_mogelijk");

  const [naam, setNaam] = useState("");
  const [telefoonNr, setTelefoonNr] = useState("");
  const [email, setEmail] = useState("");
  const [toelichting, setToelichting] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [consentVink, setConsentVink] = useState(true);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const ontwerp = route !== "vragen";
  const stap = ontwerp ? dstap : vstap;
  const stappen = ontwerp ? STAPPEN_ONTWERP : STAPPEN_VRAGEN;
  const laatste = stappen.length;
  const link = parsePlannerLink(plannerTekst);

  const bon = useMemo(
    () =>
      bouwBon({
        bron,
        route,
        stap,
        link: gelezen ? { bon: gelezen.bon, prijzen: gelezen.prijzen } : null,
        aantalBestanden: bestanden.length,
        pakket,
        demontage,
        klus,
        grootte,
        opstelling,
        extras,
        periode,
      }),
    [bron, route, stap, gelezen, bestanden.length, pakket, demontage, klus, grootte, opstelling, extras, periode]
  );

  const contactGeldig = isGeldigeNaam(naam) && isGeldigeTelefoon(telefoonNr) && isGeldigeEmail(email);

  const stapGeldig = (() => {
    if (stap === laatste) return contactGeldig;
    if (ontwerp) {
      if (dstap === 1) return route === "link" ? !!gelezen : bestanden.length > 0;
      if (dstap === 2) return route === "link" || (!!grootte && !!opstelling);
      if (dstap === 3) return isGeldigePostcode(postcode);
    } else {
      if (vstap === 1) return !!klus;
      if (vstap === 2) return !!grootte && !!opstelling;
      if (vstap === 3) return true;
      if (vstap === 4) return isGeldigePostcode(postcode);
    }
    return false;
  })();

  // Na elke stapwissel: kaart in beeld en focus op de kop (schermlezers horen de nieuwe stap).
  const eersteRender = useRef(true);
  useEffect(() => {
    if (eersteRender.current) {
      eersteRender.current = false;
      return;
    }
    const kaart = kaartRef.current;
    if (!kaart) return;
    if (kaart.getBoundingClientRect().top < 0) kaart.scrollIntoView({ block: "start" });
    kaart.querySelector<HTMLElement>("h2[tabindex='-1']")?.focus({ preventScroll: true });
  }, [route, dstap, vstap]);

  // Trechter: elke stap één keer per sessie (alleen na consent, zie ga-events.ts).
  useEffect(() => {
    stuurStapEenmalig(route, stap, stappen[stap - 1]);
    // Kiest de bezoeker pas later in de banner, dan alsnog de huidige stap.
    const naConsent = () => stuurStapEenmalig(route, stap, stappen[stap - 1]);
    window.addEventListener(CONSENT_CHANGED_EVENT, naConsent);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, naConsent);
  }, [route, stap, stappen]);

  function kiesRoute(r: Route) {
    if (r !== route) stuurTrechterEvent({ naam: "route_gekozen", params: { route: r } });
    setRoute(r);
    setDstap(1);
    setVstap(1);
    setFout(null);
  }

  function naarVragen(reden: "lezen_mislukt" | "geen_link" | "verzenden_mislukt") {
    // Gegevens blijven staan; alleen de route wisselt.
    stuurTrechterEvent({ naam: "overstap_naar_vragen", params: { van_route: route, reden } });
    setRoute("vragen");
    setVstap(1);
    setFout(null);
  }

  const volgende = () => {
    if (!stapGeldig) {
      if ((ontwerp && dstap === 3) || (!ontwerp && vstap === 4)) setPostcodeGeraakt(true);
      return;
    }
    setFout(null);
    if (ontwerp) setDstap((s) => Math.min(laatste, s + 1));
    else setVstap((s) => Math.min(laatste, s + 1));
  };
  const vorige = () => {
    setFout(null);
    if (ontwerp) setDstap((s) => Math.max(1, s - 1));
    else setVstap((s) => Math.max(1, s - 1));
  };

  function wijzigLink(waarde: string) {
    const herkend = parsePlannerLink(waarde);
    setPlannerTekst(herkend.ok ? herkend.url : waarde);
    setGelezen(null);
    if (lezen.status === "fout") setLezen({ status: "rust" });
  }

  async function leesOntwerp() {
    if (plannerTekst.trim() === "") {
      // Lege link (bv. getikt vanuit de prijsbalk verderop): terug naar het veld.
      const veld = document.getElementById("planner-link");
      veld?.scrollIntoView({ block: "center" });
      veld?.focus({ preventScroll: true });
      return;
    }
    if (!link.ok) {
      setLezen({ status: "fout", melding: "Dit lijkt geen link naar een IKEA Keukenplanner-ontwerp. Kopieer de deellink opnieuw." });
      return;
    }
    setLezen({ status: "bezig" });
    try {
      const fd = new FormData();
      fd.append("planner_url", link.url);
      fd.append("website", website);
      const res = await fetch("/api/ontwerp-lezen", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as OntwerpLezenAntwoord | null;
      stuurTrechterEvent({
        naam: "ontwerp_gelezen",
        params: { route: "link", gelukt: !!data?.ok, vertrouwen: data?.ok ? data.vertrouwen : "geen" },
      });
      if (data?.ok) {
        setGelezen(data);
        setLezen({ status: "rust" });
        setDstap(2);
      } else {
        setLezen({ status: "fout", melding: data?.melding ?? "Lezen lukte niet." });
      }
    } catch {
      setLezen({ status: "fout", melding: "Lezen lukte niet. Controleer je verbinding." });
    }
  }

  function voegBestandenToe(lijst: FileList | null) {
    if (!lijst) return;
    const nieuw: File[] = [];
    for (const f of Array.from(lijst)) {
      if (!TYPES.includes(f.type) || f.size === 0) {
        setBestandFout(`Alleen PDF, PNG of JPG (${f.name}).`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        setBestandFout(`Bestand te groot, max 8 MB (${f.name}).`);
        continue;
      }
      if (![...bestanden, ...nieuw].some((x) => x.name === f.name && x.size === f.size)) nieuw.push(f);
    }
    if (nieuw.length) {
      setBestanden((b) => [...b, ...nieuw].slice(0, MAX_BESTANDEN));
      setBestandFout(null);
    }
  }

  function markeerVerzonden(methode: string) {
    try {
      window.sessionStorage.setItem(OFFERTE_VERZONDEN_KEY, "1");
      window.sessionStorage.setItem(INVOERMETHODE_KEY, methode);
      window.sessionStorage.setItem(SITE_VERSIE_KEY, "v2-redesign");
    } catch {
      // sessionStorage onbereikbaar: lead is wel opgeslagen, alleen de conversie valt weg
    }
  }

  async function verstuur() {
    if (!contactGeldig || bezig) return;
    setBezig(true);
    setFout(null);
    // Zelfde consentregel als de oude configurator: zonder bannerkeuze telt de checkbox.
    let consentBron: ConsentBron = "banner";
    if (huidigeConsentKeuze() === null) {
      bewaarConsentKeuze(consentVink ? "granted" : "denied");
      consentBron = "formulier";
    }

    try {
      if (route === "vragen") {
        if (!grootte || !opstelling) throw new Error("keuze ontbreekt");
        const res = await verstuurVragenAanvraag({
          klus,
          grootte,
          opstelling,
          extras,
          postcode,
          periode,
          naam,
          telefoon: telefoonNr,
          email,
          toelichting,
          website,
          consent: huidigeConsentKeuze(),
          consent_bron: consentBron,
        });
        if (!res.ok) {
          setFout(res.error);
          setBezig(false);
          return;
        }
        markeerVerzonden("formulier");
        router.push("/bedankt");
        return;
      }

      const fd = new FormData();
      fd.append("naam", naam.trim());
      fd.append("email", email.trim());
      fd.append("telefoon", telefoonNr.trim());
      fd.append("website", website);
      fd.append("consent", huidigeConsentKeuze() ?? "");
      fd.append("consent_bron", consentBron);
      fd.append("site_versie", "v2-redesign");
      fd.append("pakket", pakket);
      fd.append("demontage", demontage ? "1" : "0");
      fd.append("postcode", postcode.trim());
      fd.append("periode", periode);
      fd.append("toelichting", toelichting.trim());
      if (route === "link") {
        if (!link.ok) throw new Error("link ontbreekt");
        fd.append("planner_url", link.url);
        if (gelezen?.lees_token) fd.append("lees_token", gelezen.lees_token);
      } else {
        for (const f of bestanden) fd.append("file", f);
        if (grootte) fd.append("grootte", grootte);
        if (opstelling) fd.append("opstelling", opstelling);
      }
      const res = await fetch(route === "link" ? "/api/offerte-link" : "/api/offerte-upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && data?.ok) {
        markeerVerzonden(route === "link" ? "link" : bestanden.some((f) => f.type === "application/pdf") ? "pdf" : "foto");
        router.push("/bedankt");
        return;
      }
      setFout(data?.error ?? "Versturen lukte niet. Probeer het opnieuw, of beantwoord de vragen zonder ontwerp.");
      setBezig(false);
    } catch {
      setFout("Versturen lukte niet. Controleer je verbinding en probeer het opnieuw.");
      setBezig(false);
    }
  }

  // Actieknop van de huidige stap (desktop in de kaart, mobiel in de balk).
  const actie: { label: string; kort: string; doe: () => void; uit: boolean; accent: boolean } =
    ontwerp && dstap === 1
      ? route === "link"
        ? { label: lezen.status === "bezig" ? "Bezig met lezen…" : "Lees mijn ontwerp", kort: lezen.status === "bezig" ? "Lezen…" : "Lees ontwerp", doe: leesOntwerp, uit: lezen.status === "bezig", accent: true }
        : { label: "Volgende", kort: "Volgende", doe: volgende, uit: bestanden.length === 0, accent: false }
      : stap < laatste
        ? { label: "Volgende", kort: "Volgende", doe: volgende, uit: false, accent: false }
        : { label: bezig ? "Versturen…" : "Vraag je vaste prijs aan", kort: bezig ? "Versturen…" : "Vraag aan", doe: verstuur, uit: bezig || !contactGeldig, accent: true };

  const toonRoutes = stap === 1;
  const pakketPrijs = (p: Pakket): string | null => {
    if (route === "link") {
      const pr: LinkPrijzen | null = gelezen?.prijzen ?? null;
      return pr ? euro(pr[p] + pr.werkbladZagen) : null;
    }
    return grootte ? toonBedrag(ontwerpBand(bron, grootte, p, false)) : null;
  };
  // Link zonder bedrag (TOON_PRIJS_BIJ_LINK uit): ook demontage zonder bedrag.
  const demontageLabel = route === "link" && !gelezen?.prijzen ? undefined : `+ ${euro(bron.demontage)}`;

  return (
    <section id="offerte" className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-[clamp(24px,4vw,48px)] px-4 pb-[clamp(40px,6vw,72px)] pt-5 sm:px-[clamp(16px,4vw,40px)] sm:pt-[clamp(28px,5vw,64px)]">
      <div className="min-w-0 flex-[1_1_560px]">
        <div className={toonRoutes ? "" : "hidden lg:block"}>
          <h1 className="m-0 max-w-[15em] text-[29px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[clamp(34px,4.4vw,60px)] sm:leading-[1.02]">
            Plak je IKEA-ontwerp. Zie direct wat montage kost.
          </h1>
          <p className="mt-2.5 flex items-center gap-1.5 text-[14px] font-bold lg:hidden">
            <Ster /> {reviewSamenvatting}
          </p>
          <p className="mt-4 hidden max-w-[34em] text-[clamp(17px,1.5vw,20px)] text-v2-muted sm:block">
            We lezen je kasten, werkblad en apparaten uit de IKEA Keukenplanner. Je ziet je prijs op de bon en hebt binnen 24 uur een
            vaste prijs.
          </p>
          <p className="mt-2.5 hidden text-[15.5px] text-v2-muted sm:block">
            Liever even overleggen?{" "}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-v2-ink">
              App ons
            </a>{" "}
            of{" "}
            <a href={telefoon.link} className="font-bold text-v2-ink">
              bel {telefoon.weergave}
            </a>
            .
          </p>
        </div>

        {/* Mobiel: routes als segmenten boven de stap */}
        {toonRoutes && (
          <div role="group" aria-label="Hoe wil je je keuken doorgeven?" className="mt-[18px] grid grid-cols-3 gap-1 rounded-[10px] bg-v2-dot p-1 lg:hidden">
            {ROUTES.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={route === r.id}
                onClick={() => kiesRoute(r.id)}
                className={`min-h-11 rounded-[7px] border-0 text-[14px] font-bold text-v2-ink ${route === r.id ? "bg-white" : "bg-transparent"}`}
              >
                {r.kort}
              </button>
            ))}
          </div>
        )}

        <div ref={kaartRef} className="mt-0 scroll-mt-4 lg:mt-[26px] lg:overflow-hidden lg:rounded-xl lg:border lg:border-v2-line lg:bg-white">
          {toonRoutes && (
            <div role="group" aria-label="Hoe wil je je keuken doorgeven?" className="hidden grid-cols-3 border-b border-v2-line lg:grid">
              {ROUTES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={route === r.id}
                  onClick={() => kiesRoute(r.id)}
                  className={`min-h-16 cursor-pointer border-0 border-b-[3px] px-[18px] pb-3 pt-3.5 text-left font-[inherit] text-v2-ink ${
                    route === r.id ? "border-merk bg-white" : "border-transparent bg-v2-tab"
                  }`}
                >
                  <span className="block text-[16px] font-extrabold">{r.label}</span>
                  <span className="block text-[13.5px] text-v2-muted">{r.sub}</span>
                </button>
              ))}
            </div>
          )}

          <div className="pt-4 lg:p-[clamp(18px,3vw,32px)]">
            {!(ontwerp && dstap === 1) && <Stappenbalk stappen={stappen} huidig={stap} />}

            {/* ---------- Ontwerproute stap 1: link ---------- */}
            {ontwerp && dstap === 1 && route === "link" && (
              <div>
                <label htmlFor="planner-link" className="block text-[18px] font-extrabold tracking-[-0.01em] sm:text-[20px]">
                  Link naar je ontwerp
                </label>
                <p className="mb-3 mt-1 text-[14px] text-v2-muted sm:text-[15px]">
                  Open je ontwerp in de IKEA Keukenplanner, kies delen en kopieer de link.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <input
                    id="planner-link"
                    name="planner_link"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    placeholder="https://kitchen.planner.ikea.com/nl/nl/planner/…"
                    value={plannerTekst}
                    onChange={(e) => wijzigLink(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        leesOntwerp();
                      }
                    }}
                    aria-invalid={lezen.status === "fout"}
                    aria-describedby="planner-link-status"
                    className="min-h-14 min-w-0 flex-[1_1_320px] rounded-lg border-2 border-v2-ink bg-white px-3.5 font-mono text-[15px] text-v2-ink"
                  />
                  <button
                    type="button"
                    onClick={leesOntwerp}
                    disabled={actie.uit}
                    className="hidden min-h-14 flex-none cursor-pointer rounded-lg border-0 bg-merk px-6 font-[inherit] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60 lg:block"
                  >
                    {actie.label}
                  </button>
                </div>
                <div id="planner-link-status" aria-live="polite" className="mt-3 empty:hidden">
                  {lezen.status === "fout" && (
                    <Melding soort="fout">
                      <p className="m-0 font-bold">{lezen.melding}</p>
                      <p className="mb-0 mt-1">
                        Geen probleem: je kunt ook{" "}
                        <button type="button" onClick={() => naarVragen("lezen_mislukt")} className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] font-bold text-inherit underline underline-offset-2">
                          een paar vragen beantwoorden
                        </button>{" "}
                        of{" "}
                        <button type="button" onClick={() => kiesRoute("pdf")} className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] font-bold text-inherit underline underline-offset-2">
                          je PDF uploaden
                        </button>
                        .
                      </p>
                    </Melding>
                  )}
                </div>
                <ul className="mt-4 hidden flex-wrap gap-x-5 gap-y-1.5 p-0 text-[14.5px] text-v2-muted sm:flex">
                  <li className="flex items-center gap-1.5"><Check />Geen account of PDF nodig</li>
                  <li className="flex items-center gap-1.5"><Check />We zien alleen je ontwerp</li>
                  <li className="flex items-center gap-1.5"><Check />We checken je bestelling op ontbrekende onderdelen</li>
                </ul>
                <p className="mt-3 text-[13.5px] text-v2-muted sm:hidden">Geen account of PDF nodig. We zien alleen je ontwerp.</p>
                <p className="mt-3.5 text-[14px] sm:hidden">
                  Link niet bij de hand?{" "}
                  <button type="button" onClick={() => naarVragen("geen_link")} className="min-h-8 cursor-pointer border-0 bg-transparent p-0 font-[inherit] font-bold text-v2-ink underline underline-offset-[3px]">
                    Beantwoord een paar vragen
                  </button>
                </p>
              </div>
            )}

            {/* ---------- Ontwerproute stap 1: PDF ---------- */}
            {ontwerp && dstap === 1 && route === "pdf" && (
              <div>
                <p className="m-0 hidden text-[20px] font-extrabold tracking-[-0.01em] sm:block">Upload je ontwerp</p>
                <p className="mb-3 mt-1 hidden text-[15px] text-v2-muted sm:block">Exporteer mét de artikellijst, dan klopt je prijs het best.</p>
                <button
                  type="button"
                  onClick={() => bestandRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setSleep(true);
                  }}
                  onDragLeave={() => setSleep(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setSleep(false);
                    voegBestandenToe(e.dataTransfer.files);
                  }}
                  className={`mt-[18px] flex min-h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed p-5 text-center font-[inherit] text-v2-ink sm:mt-0 ${
                    sleep ? "border-merk bg-v2-soft" : "border-v2-line-strong bg-white lg:bg-[#F7F8F5]"
                  }`}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 16V4M7 9l5-5 5 5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-bold">
                    <span className="sm:hidden">{bestanden.length ? "Nog een bestand kiezen" : "Kies je IKEA-planner"}</span>
                    <span className="hidden sm:inline">{bestanden.length ? "Nog een bestand toevoegen" : "Sleep je planner hierheen of klik om te kiezen"}</span>
                  </span>
                  <span className="text-[13px] text-v2-muted sm:text-[14px]">PDF, PNG of JPG, max 8 MB per bestand, tot {MAX_BESTANDEN} bestanden</span>
                </button>
                <input
                  ref={bestandRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  multiple
                  className="sr-only"
                  aria-label="Kies je ontwerp (PDF, PNG of JPG)"
                  onChange={(e) => {
                    voegBestandenToe(e.target.files);
                    e.target.value = "";
                  }}
                />
                {bestandFout && <div className="mt-3"><Melding soort="fout">{bestandFout}</Melding></div>}
                {bestanden.length > 0 && (
                  <ul className="mt-3 space-y-2 p-0">
                    {bestanden.map((f, i) => (
                      <li key={`${f.name}-${f.size}`} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[14.5px] ring-1 ring-v2-line">
                        <Check />
                        <span className="flex-1 truncate">{f.name}</span>
                        <button
                          type="button"
                          aria-label={`${f.name} verwijderen`}
                          onClick={() => setBestanden((b) => b.filter((_, j) => j !== i))}
                          className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent text-v2-muted hover:bg-v2-bg"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-[13.5px] text-v2-muted">
                  We lezen je ontwerp na het versturen. Nu vragen we alleen hoe groot je keuken is, voor een eerste prijs.
                </p>
                <button
                  type="button"
                  onClick={volgende}
                  disabled={actie.uit}
                  className="mt-3.5 hidden min-h-[52px] cursor-pointer rounded-lg border-0 bg-v2-ink px-7 font-[inherit] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 lg:inline-block"
                >
                  Volgende
                </button>
              </div>
            )}

            {/* ---------- Ontwerproute stap 2: gelezen (link) of keuken (PDF) + pakket ---------- */}
            {ontwerp && dstap === 2 && (
              <div>
                {route === "link" && gelezen ? (
                  <>
                    <div className="flex items-start gap-3">
                      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" className="h-7 w-7 flex-none sm:h-8 sm:w-8">
                        <circle cx="16" cy="16" r="15" fill="var(--merk-accent)" />
                        <path d="M9 16.5l4.5 4.5L23 11.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div>
                        <h2 tabIndex={-1} className="m-0 text-[21px] font-extrabold tracking-[-0.02em] outline-none sm:text-[22px]">
                          Je ontwerp is gelezen
                        </h2>
                        <p className="mt-0.5 hidden text-[15px] text-v2-muted sm:block">Dit is wat we in je IKEA-ontwerp zien.</p>
                      </div>
                    </div>
                    {gelezen.chips.length > 0 && (
                      <ul className="mt-3.5 flex flex-wrap gap-1.5 p-0 sm:gap-2">
                        {gelezen.chips.map((c) => (
                          <li key={c} className="rounded-full bg-v2-soft px-2.5 py-[5px] text-[13.5px] font-bold text-v2-chip sm:px-3 sm:py-1.5 sm:text-[14.5px]">
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                    {gelezen.meldingen.length > 0 && (
                      <div className="mt-3.5 space-y-2">
                        {gelezen.meldingen.map((m) => (
                          <Melding key={m}>{m}</Melding>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <StapKop titel="Hoe groot is je keuken?" sub="Tel onder- en bovenkasten samen." />
                    <div className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] sm:gap-2.5">
                      {GROOTTE_OPTIES.map((o) => (
                        <KeuzeKaart key={o.value} aan={grootte === o.value} onKies={() => setGrootte(o.value)} label={o.label} sub={o.sub} />
                      ))}
                    </div>
                    <h3 className="mb-2 mt-4 text-[16px] font-extrabold sm:mb-3 sm:mt-[22px] sm:text-[18px]">Welke opstelling?</h3>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] sm:gap-2.5">
                      {OPSTELLING_OPTIES.map((o) => (
                        <KeuzeKaart key={o.value} compact aan={opstelling === o.value} onKies={() => setOpstelling(o.value)} label={o.label} sub={o.sub} />
                      ))}
                    </div>
                  </>
                )}

                <h3 className="mb-2.5 mt-5 text-[17px] font-extrabold sm:mb-3 sm:mt-6 sm:text-[19px]">Kies je pakket</h3>
                <div className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(230px,1fr))] sm:gap-2.5">
                  {PAKKET_OPTIES.map((o) => (
                    <PakketKaart key={o.value} aan={pakket === o.value} onKies={() => setPakket(o.value)} label={o.label} sub={o.sub} prijs={pakketPrijs(o.value)} />
                  ))}
                </div>
                <div className="mt-2 sm:mt-2.5">
                  <VinkKaart
                    aan={demontage}
                    onWissel={() => setDemontage((d) => !d)}
                    label="Oude keuken eruit"
                    sub="Demonteren en afvoeren, inclusief container"
                    rechts={demontageLabel}
                  />
                </div>
                <p className="mt-3 text-[14.5px] text-v2-muted">
                  {route === "link" && !gelezen?.prijzen
                    ? "Je vaste prijs volgt binnen 24 uur. We checken je ontwerp en bestelling eerst."
                    : "Klopt er iets niet, of pas je je ontwerp nog aan? Geen probleem: we checken alles voor je vaste prijs."}
                </p>
              </div>
            )}

            {/* ---------- Vragenroute ---------- */}
            {!ontwerp && vstap === 1 && (
              <div>
                <StapKop
                  titel="Wat voor klus is het?"
                  sub="Nog geen ontwerp, een andere keuken of een klus die al half af is? Dan beantwoord je een paar korte vragen."
                />
                <div className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(230px,1fr))] sm:gap-2.5">
                  {KLUS_OPTIES.map((o) => (
                    <KeuzeKaart key={o.value} aan={klus === o.value} onKies={() => setKlus(o.value)} label={o.label} sub={o.sub} />
                  ))}
                </div>
              </div>
            )}
            {!ontwerp && vstap === 2 && (
              <div>
                <StapKop titel="Hoe groot is je keuken?" sub="Tel onder- en bovenkasten samen." />
                <div className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] sm:gap-2.5">
                  {GROOTTE_OPTIES.map((o) => (
                    <KeuzeKaart key={o.value} aan={grootte === o.value} onKies={() => setGrootte(o.value)} label={o.label} sub={o.sub} />
                  ))}
                </div>
                <h3 className="mb-2 mt-4 text-[16px] font-extrabold sm:mb-3 sm:mt-[22px] sm:text-[18px]">Welke opstelling?</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] sm:gap-2.5">
                  {OPSTELLING_OPTIES.map((o) => (
                    <KeuzeKaart key={o.value} compact aan={opstelling === o.value} onKies={() => setOpstelling(o.value)} label={o.label} sub={o.sub} />
                  ))}
                </div>
              </div>
            )}
            {!ontwerp && vstap === 3 && (
              <div>
                <StapKop titel="Wil je er nog iets bij?" sub="Kies wat van toepassing is. Overslaan kan ook." />
                <div className="flex flex-col gap-2">
                  {extraOpties(bron).map((e) => (
                    <VinkKaart
                      key={e.key}
                      aan={!!extras[e.key]}
                      onWissel={() => setExtras((x) => ({ ...x, [e.key]: !x[e.key] }))}
                      label={e.label}
                      sub={e.sub}
                      rechts={extraLabel(e.bedrag)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ---------- Waar en wanneer (beide routes) ---------- */}
            {((ontwerp && dstap === 3) || (!ontwerp && vstap === 4)) && (
              <div>
                <StapKop titel="Waar en wanneer?" sub="Alleen je postcode, geen volledig adres nodig." />
                <Veld id="postcode" label="Postcode">
                  <input
                    id="postcode"
                    name="postcode"
                    autoComplete="postal-code"
                    placeholder="1234 AB"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    onBlur={() => setPostcodeGeraakt(true)}
                    aria-invalid={postcodeGeraakt && !isGeldigePostcode(postcode)}
                    aria-describedby="postcode-fout"
                    className={postcodeKlasse}
                  />
                </Veld>
                <p id="postcode-fout" className="mt-1.5 text-[14px] font-semibold text-[#8A2414] empty:hidden">
                  {postcodeGeraakt && !isGeldigePostcode(postcode) ? "Vul een geldige postcode in, bijvoorbeeld 1234 AB." : ""}
                </p>
                <p className="mb-2.5 mt-5 text-[14px] font-bold sm:text-[15px]">Wanneer moet de keuken erin staan?</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] sm:gap-2.5">
                  {PERIODE_OPTIES.map((o) => (
                    <KeuzeKaart key={o.value} compact aan={periode === o.value} onKies={() => setPeriode(o.value)} label={o.label} sub={o.sub} />
                  ))}
                </div>
              </div>
            )}

            {/* ---------- Gegevens (beide routes) ---------- */}
            {stap === laatste && (
              <div>
                <StapKop titel="Waar sturen we je vaste prijs naartoe?" sub="Binnen 24 uur in je mail. Vrijblijvend, je zit nergens aan vast." />
                <div className="grid gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] sm:gap-3">
                  <Veld id="naam" label="Naam">
                    <input id="naam" name="naam" autoComplete="name" value={naam} onChange={(e) => setNaam(e.target.value)} className={invoerKlasse} />
                  </Veld>
                  <Veld id="telefoon" label="Telefoon">
                    <input id="telefoon" name="telefoon" type="tel" inputMode="tel" autoComplete="tel" value={telefoonNr} onChange={(e) => setTelefoonNr(e.target.value)} className={invoerKlasse} />
                  </Veld>
                  <div className="sm:col-span-full">
                    <Veld id="email" label="E-mail">
                      <input id="email" name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={invoerKlasse} />
                    </Veld>
                  </div>
                  <div className="sm:col-span-full">
                    <Veld id="toelichting" label="Toelichting" extra="(mag leeg)">
                      <textarea id="toelichting" name="toelichting" rows={3} value={toelichting} onChange={(e) => setToelichting(e.target.value)} className={`${invoerKlasse} resize-y py-2.5`} />
                    </Veld>
                  </div>
                </div>
                {/* Honeypot: onzichtbaar voor mensen, bots vullen 'm vaak in. */}
                <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
                  <label>
                    Vul dit veld niet in
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </label>
                </div>
                <ConsentCheckbox checked={consentVink} onChange={setConsentVink} className="mt-3 !items-start !text-[14.5px] !text-v2-muted" />
              </div>
            )}

            {fout && (
              <div className="mt-4">
                <Melding soort="fout">
                  <p className="m-0">{fout}</p>
                  {route !== "vragen" && (
                    <p className="mb-0 mt-1">
                      Lukt het niet?{" "}
                      <button type="button" onClick={() => naarVragen("verzenden_mislukt")} className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] font-bold text-inherit underline underline-offset-2">
                        Beantwoord een paar vragen
                      </button>
                      , je gegevens blijven staan.
                    </p>
                  )}
                </Melding>
              </div>
            )}

            {/* Navigatie op desktop; mobiel zit die in de prijsbalk */}
            {!(ontwerp && dstap === 1) && (
              <div className="mt-6 hidden flex-wrap items-center justify-between gap-3 lg:flex">
                {stap > 1 && (
                  <button type="button" onClick={vorige} className="min-h-12 cursor-pointer border-0 bg-transparent px-1 font-[inherit] font-bold text-v2-ink underline underline-offset-4">
                    Vorige
                  </button>
                )}
                <button
                  type="button"
                  onClick={actie.doe}
                  disabled={actie.uit}
                  className={`ml-auto min-h-[52px] cursor-pointer rounded-lg border-0 px-7 font-[inherit] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 ${actie.accent ? "bg-merk" : "bg-v2-ink"}`}
                >
                  {actie.label}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Bon bon={bon} merknaam={merknaam} telefoon={telefoon.weergave} />

      {/* Mobiel: prijs en knop vast onderin beeld */}
      <div
        className="fixed inset-x-0 z-40 flex items-center gap-2.5 border-t border-v2-line bg-white px-3 pt-2.5 shadow-[0_-10px_24px_-18px_rgba(21,23,26,0.5)] lg:hidden"
        style={{ bottom: "var(--consent-bar-h, 0px)", paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        {stap > 1 && (
          <button
            type="button"
            onClick={vorige}
            aria-label="Vorige stap"
            className="inline-flex h-12 w-11 flex-none cursor-pointer items-center justify-center rounded-lg border-2 border-v2-line bg-white"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3L5 8l5 5" fill="none" stroke="#15171A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="m-0 text-[12px] font-bold text-v2-muted">{bon.balkLabel}</p>
          <p className={`m-0 truncate text-[17px] font-extrabold tracking-[-0.02em] ${bon.gedempt ? "text-v2-muted" : "text-merk"}`}>{bon.balkPrijs}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (kaartRef.current && kaartRef.current.getBoundingClientRect().bottom < 0) kaartRef.current.scrollIntoView({ block: "start" });
            actie.doe();
          }}
          disabled={actie.uit}
          className={`h-12 flex-none cursor-pointer rounded-lg border-0 px-4 font-[inherit] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 ${actie.accent ? "bg-merk" : "bg-v2-ink"}`}
        >
          {actie.kort}
        </button>
      </div>
    </section>
  );
}

function Ster() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z" fill="var(--merk-accent)" />
    </svg>
  );
}

function Stappenbalk({ stappen, huidig }: { stappen: string[]; huidig: number }) {
  return (
    <>
      {/* Desktop: pillen */}
      <ol aria-label="Stappen" className="mb-5 hidden flex-wrap gap-1.5 p-0 lg:flex">
        {stappen.map((label, i) => {
          const n = i + 1;
          const nu = n === huidig;
          const klaar = n < huidig;
          return (
            <li
              key={label}
              aria-current={nu ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[14px] font-bold ${
                nu ? "bg-v2-ink text-white" : klaar ? "bg-v2-soft text-v2-ink" : "text-v2-muted"
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] ${
                  nu ? "bg-merk text-white" : klaar ? "bg-v2-ink text-white" : "bg-v2-dot text-v2-ink"
                }`}
              >
                {klaar ? "✓" : n}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
      {/* Mobiel: segmenten + "Stap x van y" */}
      <div className="mb-3.5 lg:hidden">
        <div className="flex gap-1" aria-hidden="true">
          {stappen.map((label, i) => (
            <span key={label} className={`h-[5px] flex-1 rounded-full ${i + 1 < huidig ? "bg-v2-ink" : i + 1 === huidig ? "bg-merk" : "bg-v2-line"}`} />
          ))}
        </div>
        <p className="mt-2 text-[13.5px] font-bold text-v2-muted">
          Stap {huidig} van {stappen.length}: {stappen[huidig - 1].toLowerCase()}
        </p>
      </div>
    </>
  );
}
