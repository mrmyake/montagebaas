"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileCheck2, Loader2, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/configurator/parts";
import { OFFERTE_VERZONDEN_KEY } from "@/components/analytics/ConversionTracker";

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
 * De "snelweg" bovenaan /offerte: sleep/kies één of meer bestanden van je IKEA
 * Keukenplanner-ontwerp (PDF of foto's) + minimale contactgegevens. Bij succes →
 * zelfde conversie-flow als het formulier (sessionStorage-vlag + redirect naar
 * /bedankt?a=<id>, waar de prijsindicatie wordt opgehaald). Mislukte upload → fallback.
 */
export function TekeningUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sleep, setSleep] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

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
    if (!files.length || !contactGeldig || bezig) return;
    setBezig(true);
    setFout(null);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("file", f);
      fd.append("naam", naam.trim());
      fd.append("email", email.trim());
      fd.append("telefoon", telefoon.trim());
      fd.append("website", website); // honeypot
      const res = await fetch("/api/offerte-upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; id?: string }
        | null;
      if (res.ok && data?.ok) {
        try {
          window.sessionStorage.setItem(OFFERTE_VERZONDEN_KEY, "1");
        } catch {}
        router.push(data.id ? `/bedankt?a=${data.id}` : "/bedankt");
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
        Sleep de PDF of foto&apos;s van je IKEA Keukenplanner-ontwerp hierheen (of tik om te
        kiezen). Je krijgt meteen een prijsindicatie; je exacte vaste prijs volgt binnen 24 uur.
        Tip: exporteer mét de artikellijst — dan is je indicatie het nauwkeurigst.
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
        className={`mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
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

      {/* Contactvelden — pas tonen zodra er minstens één bestand is gekozen */}
      {files.length > 0 && (
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

      {files.length > 0 && (
        <div className="mt-5">
          <Button onClick={verstuur} disabled={!contactGeldig || bezig} className="w-full sm:w-auto">
            {bezig ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Bezig met versturen…
              </>
            ) : (
              <>Verstuur ontwerp &amp; bekijk je indicatie</>
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
