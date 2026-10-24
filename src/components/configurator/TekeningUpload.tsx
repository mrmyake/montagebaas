"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileCheck2, Loader2, X, Plus, Link2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/configurator/parts";
import { INVOERMETHODE_KEY, OFFERTE_VERZONDEN_KEY } from "@/components/analytics/ConversionTracker";
import { parsePlannerLink } from "@/lib/ikea-planner/link";
import { bewaarConsentKeuze, huidigeConsentKeuze, type ConsentBron } from "@/lib/consent";
import { ConsentCheckbox } from "@/components/analytics/ConsentCheckbox";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per bestand
const MAX_FILES = 8;
const TOEGESTANE_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const FALLBACK =
  "Upload lukte niet — beschrijf je keuken dan hieronder kort in het formulier, dan maken we een indicatie.";

function valideerBestand(f: File): string | null {
  if (!TOEGESTANE_TYPES.includes(f.type)) return FALLBACK;
  if (f.size === 0) return FALLBACK;
  if (f.size > MAX_BYTES) return `Bestand te groot (max 8 MB): ${f.name}. ` + FALLBACK;
  return null;
}

/**
 * De "snelweg" bovenaan /offerte: plak de deellink van je IKEA Keukenplanner-
 * ontwerp (aanbevolen), en/of sleep/kies één of meer bestanden (PDF of foto's),
 * + minimale contactgegevens. Bij succes → zelfde conversie-flow als het
 * formulier (sessionStorage-vlag + redirect naar /bedankt). Upload-pad gaat naar
 * /bedankt?a=<id>, waar de prijsindicatie wordt opgehaald; het link-pad toont
 * (nog) geen bedrag en gaat naar /bedankt zonder id. Mislukt → fallback.
 */
export function TekeningUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [plannerTekst, setPlannerTekst] = useState("");
  const [linkGeraakt, setLinkGeraakt] = useState(false); // foutmelding pas na blur
  const [files, setFiles] = useState<File[]>([]);
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [consentVink, setConsentVink] = useState(true); // alleen getoond zonder bannerkeuze; vooraf aangevinkt
  const [sleep, setSleep] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const link = parsePlannerLink(plannerTekst);
  const heeftLink = link.ok;
  const linkOngeldig = plannerTekst.trim() !== "" && !heeftLink;
  const heeftInvoer = heeftLink || files.length > 0;

  // Plakken uit WhatsApp/mail: tekst en witruimte rond de link meteen wegfilteren.
  function wijzigLink(waarde: string) {
    const herkend = parsePlannerLink(waarde);
    setPlannerTekst(herkend.ok ? herkend.url : waarde);
    if (herkend.ok) setFout(null);
  }

  const contactGeldig =
    naam.trim().length > 1 &&
    telefoon.trim().length >= 8 &&
    /^\S+@\S+\.\S+$/.test(email.trim());

  function voegToe(lijst: FileList | File[] | null) {
    if (!lijst) return;
    const nieuw: File[] = [];
    for (const f of Array.from(lijst)) {
      const err = valideerBestand(f);
      if (err) {
        setFout(err);
        continue;
      }
      // dubbele (zelfde naam + grootte) overslaan
      if (![...files, ...nieuw].some((x) => x.name === f.name && x.size === f.size)) {
        nieuw.push(f);
      }
    }
    if (nieuw.length) {
      setFiles((huidig) => [...huidig, ...nieuw].slice(0, MAX_FILES));
      setFout((f) => (nieuw.length ? null : f));
    }
  }

  function verwijder(index: number) {
    setFiles((huidig) => huidig.filter((_, i) => i !== index));
  }

  async function verstuur() {
    if (!heeftInvoer || linkOngeldig || !contactGeldig || bezig) return;
    setBezig(true);
    setFout(null);
    // Geen bannerkeuze? Dan telt de checkbox: aangevinkt = accepteren, uitgevinkt
    // = weigeren — zelfde update als de bannerknoppen, vóór de fetch zodat de
    // attributiecookie nog meegaat.
    let consentBron: ConsentBron = "banner";
    if (huidigeConsentKeuze() === null) {
      bewaarConsentKeuze(consentVink ? "granted" : "denied");
      consentBron = "formulier";
    }
    try {
      const fd = new FormData();
      for (const f of files) fd.append("file", f);
      fd.append("naam", naam.trim());
      fd.append("email", email.trim());
      fd.append("telefoon", telefoon.trim());
      fd.append("website", website); // honeypot
      fd.append("consent", huidigeConsentKeuze() ?? "");
      fd.append("consent_bron", consentBron);
      if (link.ok) fd.append("planner_url", link.url);
      const res = await fetch(link.ok ? "/api/offerte-link" : "/api/offerte-upload", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; id?: string }
        | null;
      if (res.ok && data?.ok) {
        const methode = link.ok
          ? "link"
          : files.some((f) => f.type === "application/pdf")
            ? "pdf"
            : "foto";
        try {
          window.sessionStorage.setItem(OFFERTE_VERZONDEN_KEY, "1");
          window.sessionStorage.setItem(INVOERMETHODE_KEY, methode);
        } catch {}
        // Link-pad: (nog) geen prijsindicatie op /bedankt, dus niets te pollen.
        router.push(!link.ok && data.id ? `/bedankt?a=${data.id}` : "/bedankt");
        return;
      }
      setFout(data?.error || FALLBACK);
      setBezig(false);
    } catch {
      setFout(FALLBACK);
      setBezig(false);
    }
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent-soft/40 p-5 shadow-card sm:p-6">
      <h2 className="text-lg font-bold text-ink sm:text-xl">
        Heb je een ontwerp uit de IKEA Keukenplanner?
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Plak de link naar je ontwerp: dan lezen we je complete artikellijst in en krijg je binnen
        24 uur een exacte vaste prijs. Geen link bij de hand? Upload dan de PDF of foto&apos;s.
      </p>

      {/* Planner-link (aanbevolen) */}
      <div className="mt-4">
        <label htmlFor="planner-link" className="mb-1.5 block text-sm font-semibold text-ink">
          Link naar je IKEA keukenplanner{" "}
          <span className="font-medium text-accent">(aanbevolen)</span>
        </label>
        <div className="relative">
          <Link2 size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="planner-link"
            className={`${inputClass} pl-10`}
            type="url"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            placeholder="https://kitchen.planner.ikea.com/…"
            value={plannerTekst}
            onChange={(e) => wijzigLink(e.target.value)}
            onBlur={() => setLinkGeraakt(true)}
            aria-invalid={linkGeraakt && linkOngeldig}
            aria-describedby="planner-link-hulp"
          />
        </div>
        {heeftLink && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-trust">
            <CheckCircle2 size={16} /> Ontwerp herkend
          </p>
        )}
        {linkGeraakt && linkOngeldig && (
          <p className="mt-1.5 text-sm font-medium text-accent">
            Dit lijkt geen link naar een IKEA Keukenplanner-ontwerp. Kopieer de deellink opnieuw
            (zie hieronder), of upload je PDF.
          </p>
        )}
        <details id="planner-link-hulp" className="mt-2 text-sm text-ink-soft">
          <summary className="cursor-pointer font-medium text-ink-soft hover:text-ink">
            Hoe kopieer ik de link?
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Open je ontwerp in de IKEA Keukenplanner en klik op <strong>Opslaan</strong>.</li>
            <li>Kies <strong>Delen</strong> en daarna <strong>Link kopiëren</strong>.</li>
            <li>Plak de link hierboven. Tekst eromheen (bijv. uit WhatsApp of mail) mag blijven staan.</li>
          </ol>
        </details>
      </div>

      <p className="mt-5 text-sm font-medium text-muted">
        {heeftLink ? "Eventueel ook je PDF of foto’s meesturen:" : "Of upload je PDF of foto’s:"}
      </p>

      {/* Dropzone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setSleep(true);
        }}
        onDragLeave={() => setSleep(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSleep(false);
          voegToe(e.dataTransfer.files);
        }}
        className={`mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          sleep ? "border-accent bg-accent-soft" : "border-line-strong bg-paper hover:border-accent"
        }`}
      >
        <UploadCloud className="text-accent" size={28} />
        <span className="text-sm font-semibold text-ink">
          {files.length
            ? "Tik om nog een bestand toe te voegen"
            : "Sleep je IKEA Keukenplanner-bestand(en) hierheen of tik om te kiezen"}
        </span>
        <span className="text-xs text-muted">PDF, PNG of JPG · max 8 MB per bestand · tot {MAX_FILES} bestanden</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        multiple
        className="sr-only"
        onChange={(e) => {
          voegToe(e.target.files);
          e.target.value = ""; // zelfde bestand opnieuw kunnen kiezen
        }}
      />

      {/* Gekozen bestanden */}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm ring-1 ring-line"
            >
              <FileCheck2 size={16} className="shrink-0 text-trust" />
              <span className="flex-1 truncate text-ink">{f.name}</span>
              <button
                type="button"
                aria-label={`${f.name} verwijderen`}
                onClick={() => verwijder(i)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-line"
              >
                <X size={14} />
              </button>
            </li>
          ))}
          {files.length < MAX_FILES && (
            <li>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                <Plus size={15} /> Nog een bestand toevoegen
              </button>
            </li>
          )}
        </ul>
      )}

      {/* Contactvelden — pas tonen zodra er een geldige link of minstens één bestand is */}
      {heeftInvoer && (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="Naam">
            <input className={inputClass} value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Voor- en achternaam" autoComplete="name" />
          </Field>
          <Field label="E-mail">
            <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jij@voorbeeld.nl" autoComplete="email" inputMode="email" type="email" />
          </Field>
          <Field label="Telefoon">
            <input className={inputClass} value={telefoon} onChange={(e) => setTelefoon(e.target.value)} placeholder="06 - 12 34 56 78" autoComplete="tel" inputMode="tel" />
          </Field>
        </div>
      )}

      {/* Honeypot — onzichtbaar voor mensen */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label>
          Vul dit veld niet in
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {fout && (
        <p className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">{fout}</p>
      )}

      {heeftInvoer && (
        <div className="mt-5">
          <ConsentCheckbox checked={consentVink} onChange={setConsentVink} className="mb-4" />
          <Button onClick={verstuur} disabled={!contactGeldig || linkOngeldig || bezig} className="w-full sm:w-auto">
            {bezig ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Bezig met versturen…
              </>
            ) : (
              <>{heeftLink ? "Verstuur ontwerp" : "Verstuur ontwerp & bekijk je indicatie"}</>
            )}
          </Button>
          {!contactGeldig && (
            <p className="mt-2 text-xs text-muted">Vul je naam, e-mail en telefoon in om te versturen.</p>
          )}
        </div>
      )}
    </div>
  );
}
