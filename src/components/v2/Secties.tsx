import Link from "next/link";
import type { Merk } from "@/lib/merk";
import { reviewSamenvatting } from "@/lib/merk";
import { kostenKaarten, tekstBedragen } from "@/lib/prijs-weergave";

/** Gedeelde sectiebreedte en -padding uit de mockup. */
const binnen = "mx-auto max-w-[1240px] px-4 sm:px-[clamp(16px,4vw,40px)]";
const ruimte = "py-[clamp(56px,7vw,96px)]";
const h2 = "m-0 text-[clamp(30px,3.4vw,46px)] font-extrabold leading-[1.08] tracking-[-0.03em]";
const lead = "mt-3 text-[18px] text-v2-muted";

function Ster({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z" fill="var(--merk-accent)" />
    </svg>
  );
}

export function Vertrouwensbalk({ merk }: { merk: Merk }) {
  return (
    <section aria-label={`Waarom ${merk.naam}`} className="border-y border-v2-line bg-white">
      <div className={`${binnen} flex flex-wrap justify-between gap-x-7 gap-y-3 py-5 text-[15.5px] font-bold`}>
        <span className="inline-flex items-center gap-2">
          <Ster />
          {reviewSamenvatting(merk)}
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Vaste prijs binnen 24 uur
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Gespecialiseerd in IKEA METOD
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          {merk.werkgebied.kort}
        </span>
      </div>
    </section>
  );
}

export function Kosten() {
  const kaarten = kostenKaarten();
  const b = tekstBedragen();
  return (
    <section id="kosten" className={`${binnen} ${ruimte}`}>
      <h2 className={h2}>Wat kost het ongeveer?</h2>
      <p className={`${lead} max-w-[36em]`}>Richtprijzen voor complete montage. Met je IKEA-link zie je bovenaan je eigen prijs.</p>
      <div className="mt-9 grid gap-5 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        {kaarten.map((k, i) => {
          const donker = i === 1;
          return (
            <div
              key={k.grootte}
              className={`relative py-[26px] pl-[52px] pr-[26px] ${donker ? "bg-v2-ink text-white" : "bg-white"}`}
              style={{ clipPath: "polygon(30px 0, 100% 0, 100% 100%, 30px 100%, 0 50%)" }}
            >
              <span aria-hidden="true" className="absolute left-5 top-1/2 -mt-1.5 h-3 w-3 rounded-full bg-v2-bg" />
              {donker && <p className="mb-1.5 mt-0 text-[13.5px] font-bold text-[#C9CDC6]">Meest gekozen</p>}
              <h3 className="m-0 text-[20px] font-extrabold">{k.titel}</h3>
              <p className={`mt-1.5 text-[15px] ${donker ? "text-[#C9CDC6]" : "text-v2-muted"}`}>{k.sub}</p>
              <p className={`mt-[18px] text-[30px] font-extrabold tracking-[-0.02em] ${donker ? "" : "text-merk"}`}>{k.band}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-[15px] text-v2-muted">
        Inclusief apparaten aansluiten, btw en reiskosten. Zet je de kasten zelf in elkaar? Met Montageklaar betaal je ongeveer{" "}
        {b.montageklaarScheelt} minder. Oude keuken eruit kost {b.demontage} extra, inclusief container.
      </p>
    </section>
  );
}

const VERGELIJK: { rij: string; zelf: string; platform: string; wij: string }[] = [
  { rij: "Wat het kost", zelf: "Alleen je tijd en gereedschap", platform: "Per klusser anders, vaak per uur", wij: "Vaste prijs vooraf, op basis van je eigen ontwerp" },
  { rij: "Planning", zelf: "Avonden en weekenden", platform: "Hangt af van wie reageert", wij: "Een vaste startdatum, in overleg" },
  { rij: "Je bestelling", zelf: "Missende onderdelen merk je bij het monteren", platform: "Wisselt per klusser", wij: "We lopen je artikellijst vooraf na" },
  { rij: "Apparaten en werkblad", zelf: "Zelf uitzoeken", platform: "Wisselt per klusser", wij: "Inbegrepen bij complete montage" },
  { rij: "Aanspreekpunt", zelf: "Jijzelf", platform: "Wie op je klus reageert", wij: "Eén vast aanspreekpunt" },
];

export function Vergelijk({ merk }: { merk: Merk }) {
  return (
    <section id="vergelijk" className="border-y border-v2-line bg-white">
      <div className={`${binnen} ${ruimte}`}>
        <h2 className={h2}>Zelf doen, een klusplatform of {merk.naam}?</h2>
        <p className={`${lead} max-w-[38em]`}>Alle drie kunnen een prima keuken opleveren. Dit is waar ze verschillen.</p>
        <div className="mt-8 overflow-x-auto" tabIndex={0} role="region" aria-label="Vergelijking">
          <table className="w-full min-w-[720px] border-collapse text-[16px]">
            <thead>
              <tr>
                <td className="w-[22%] px-4 py-3.5" />
                <th scope="col" className="px-4 py-3.5 text-left text-[17px] font-extrabold">Zelf doen</th>
                <th scope="col" className="px-4 py-3.5 text-left text-[17px] font-extrabold">Klusplatform</th>
                <th scope="col" className="border-t-4 border-merk bg-v2-soft px-4 py-3.5 text-left text-[17px] font-extrabold">{merk.naam}</th>
              </tr>
            </thead>
            <tbody>
              {VERGELIJK.map((r, i) => (
                <tr key={r.rij} className={`border-t border-v2-line ${i === VERGELIJK.length - 1 ? "border-b" : ""}`}>
                  <th scope="row" className="p-4 text-left font-bold">{r.rij}</th>
                  <td className="p-4 text-v2-muted">{r.zelf}</td>
                  <td className="p-4 text-v2-muted">{r.platform}</td>
                  <td className="bg-v2-soft p-4 font-bold">{r.wij}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const STAPPEN = [
  { titel: "Plak je IKEA-link", tekst: "We lezen je ontwerp en je ziet direct je prijs. Geen link? Dan beantwoord je een paar vragen." },
  { titel: "Vaste prijs binnen 24 uur", tekst: "We checken je ontwerp en bestelling, en sturen een vaste prijs zonder verrassingen." },
  { titel: "Plannen wanneer het jou past", tekst: "Akkoord? Dan kies je samen met ons de montagedatum." },
  { titel: "Vakkundige montage", tekst: "Ilja plaatst je keuken zelf, netjes en compleet." },
];

export function Werkwijze() {
  return (
    <section id="werkwijze" className={`${binnen} ${ruimte}`}>
      <h2 className={h2}>In vier stappen een werkende keuken</h2>
      <ol className="mt-9 grid gap-4 p-0 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
        {STAPPEN.map((s, i) => (
          <li key={s.titel} className="list-none rounded-xl bg-white p-6">
            <span aria-hidden="true" className="font-mono text-[15px] font-semibold text-merk">Stap {i + 1}</span>
            <h3 className="mb-1.5 mt-2 text-[20px] font-extrabold">{s.titel}</h3>
            <p className="m-0 text-[15.5px] text-v2-muted">{s.tekst}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Reviews({ merk }: { merk: Merk }) {
  const r = merk.reviews;
  return (
    <section id="reviews" className="border-y border-v2-line bg-white">
      <div className={`${binnen} ${ruimte} flex flex-wrap items-start gap-[clamp(28px,5vw,56px)]`}>
        <div className="min-w-0 flex-[1_1_260px]">
          <h2 className={h2}>Wat anderen zeggen</h2>
          <p className="mt-5 flex items-baseline gap-2.5">
            <span className="text-[64px] font-extrabold leading-none tracking-[-0.04em]">{r.totaal.score}</span>
            <span className="text-v2-muted">uit {r.totaal.aantal} reviews</span>
          </p>
          <p className="mt-1.5 text-v2-muted">
            <a href={r.google.url} target="_blank" rel="noopener noreferrer" className="text-v2-ink">
              {r.google.score} op Google
            </a>{" "}
            ({r.google.aantal}) en{" "}
            <a href={r.werkspot.url} target="_blank" rel="noopener noreferrer" className="text-v2-ink">
              {r.werkspot.score} op Werkspot
            </a>{" "}
            ({r.werkspot.aantal})
          </p>
          <Link href="/reviews" className="mt-2 inline-flex min-h-11 items-center font-bold text-v2-ink">
            Lees alle reviews
          </Link>
        </div>
        <div className="grid min-w-0 flex-[2_1_520px] gap-4 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {r.homepage.map((q) => (
            <figure key={q.naam} className="m-0 rounded-xl bg-v2-bg p-6">
              <blockquote className="m-0 text-[18px] leading-[1.45]">“{q.tekst}”</blockquote>
              <figcaption className="mt-3.5 text-[14.5px] text-v2-muted">
                <strong className="text-v2-ink">{q.naam}</strong>
                {q.klus ? `, ${q.klus}` : ""}
                {q.plaats ? `, ${q.plaats}` : ""} · {q.bron === "google" ? "Google" : "Werkspot"}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Werkgebied({ merk }: { merk: Merk }) {
  const w = merk.werkgebied;
  return (
    <section id="werkgebied" className={`${binnen} ${ruimte} flex flex-wrap gap-x-14 gap-y-6`}>
      <div className="min-w-0 flex-[1_1_320px]">
        <h2 className={h2}>
          Tot {w.straalKm} km rond {w.centrum}
        </h2>
        <p className={lead}>{w.tekst} Ilja plaatst je keuken zelf, netjes en compleet.</p>
        <p className="mt-3 text-[15px] text-v2-muted">
          Woon je verder weg?{" "}
          <a href={merk.telefoon.link} className="font-bold text-v2-ink">
            Bel {merk.telefoon.weergave}
          </a>
          , dan kijken we of het past.
        </p>
      </div>
      <ul className="grid min-w-0 flex-[2_1_520px] grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-4 gap-y-0.5 p-0 font-medium">
        {w.steden.map((s) => (
          <li key={s.slug} className="list-none">
            <Link href={`/keukenmonteur/${s.slug}`} className="inline-flex min-h-10 items-center text-v2-ink">
              {s.naam}
            </Link>
          </li>
        ))}
        <li className="list-none">
          <Link href="/werkgebied" className="inline-flex min-h-10 items-center font-bold text-v2-ink">
            Alle plaatsen
          </Link>
        </li>
      </ul>
    </section>
  );
}

export interface FaqVraag {
  vraag: string;
  antwoord: string;
}

export function faqVragen(merk: Merk): FaqVraag[] {
  const b = tekstBedragen();
  return [
    {
      vraag: "Waar vind ik de link naar mijn ontwerp?",
      antwoord:
        "Open je ontwerp in de IKEA Keukenplanner en kies delen. Kopieer de link en plak hem bovenaan deze pagina. Een PDF met artikellijst werkt ook.",
    },
    {
      vraag: "Wat als ik mijn ontwerp nog aanpas?",
      antwoord: "Geen probleem. Je offerte gaat uit van het ontwerp van vandaag. Vóór de montage checken we je definitieve bestellijst.",
    },
    {
      vraag: "Wat kost het om een IKEA-keuken te laten plaatsen?",
      antwoord: `Een gemiddelde keuken met 8 tot 15 kasten kost tussen ${b.gemiddeld.replace(" – ", " en ")}, inclusief apparaten aansluiten. Met je IKEA-link zie je je eigen prijs.`,
    },
    {
      vraag: "Hoe snel kunnen jullie komen?",
      antwoord: "Je offerte heb je binnen 24 uur. De montage plannen we samen, zo dicht mogelijk bij je IKEA-levering.",
    },
    {
      vraag: "In welk gebied werken jullie?",
      antwoord: `${merk.werkgebied.tekst} Woon je verder weg? Bel of app even, dan kijken we of het past. ${merk.werkgebied.parkeren}`,
    },
    {
      vraag: "Plaatsen jullie ook keukens die niet van IKEA zijn?",
      antwoord: "Ja, ook bouwpakketkeukens van andere leveranciers. Kies bovenaan voor Vragen beantwoorden.",
    },
    {
      vraag: "Halen jullie ook de oude keuken eruit?",
      antwoord: `Ja, voor ${b.demontage} inclusief container. Vink het aan als je je pakket kiest.`,
    },
  ];
}

export function Faq({ vragen }: { vragen: FaqVraag[] }) {
  return (
    <section id="vragen" className="border-t border-v2-line bg-white">
      <div className={`${binnen} ${ruimte}`}>
        <h2 className={h2}>Veelgestelde vragen</h2>
        <div className="mt-7 grid gap-x-10 sm:grid-cols-[repeat(auto-fit,minmax(340px,1fr))]">
          {vragen.map((v) => (
            <details key={v.vraag} className="border-t border-v2-line py-[18px] last:border-b">
              <summary className="text-[18px] font-bold">{v.vraag}</summary>
              <p className="mt-2.5 text-v2-muted">{v.antwoord}</p>
            </details>
          ))}
        </div>
        <Link href="/veelgestelde-vragen" className="mt-4 inline-flex min-h-11 items-center font-bold text-v2-ink">
          Alle vragen bekijken
        </Link>
      </div>
    </section>
  );
}

export function SlotCta({ merk }: { merk: Merk }) {
  return (
    <section className={`${binnen} py-[clamp(48px,6vw,80px)]`}>
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-merk p-[clamp(28px,4vw,48px)] text-white">
        <div className="min-w-0 flex-[1_1_380px]">
          <h2 className="m-0 text-[clamp(28px,3.4vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em]">Je ontwerp is klaar. Je prijs ook.</h2>
          <p className="mt-2.5 text-[18px]">Plak je IKEA-link en zie direct wat montage kost.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-3">
          <a href="#offerte" className="inline-flex min-h-[54px] items-center rounded-lg bg-white px-[26px] text-[18px] font-extrabold text-v2-ink no-underline">
            Plak je link
          </a>
          <a href={merk.telefoon.link} className="inline-flex min-h-11 items-center font-bold text-white">
            Of bel {merk.telefoon.weergave}
          </a>
        </div>
      </div>
    </section>
  );
}
