"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileCheck2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/configurator/parts";
import { OFFERTE_VERZONDEN_KEY } from "@/components/analytics/ConversionTracker";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const TOEGESTANE_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const FALLBACK =
  "Upload lukte niet — beschrijf je keuken dan hieronder kort in het formulier, dan maken we een indicatie.";

function valideerBestand(f: File): string | null {
  if (!TOEGESTANE_TYPES.includes(f.type)) return FALLBACK;
  if (f.size === 0) return FALLBACK;
  if (f.size > MAX_BYTES) return "Bestand te groot (max 8 MB). " + FALLBACK;
  return null;
}

/**
 * De "snelweg" bovenaan /offerte: sleep/kies een IKEA-tekening + minimale
 * contactgegevens. Bij succes → zelfde conversie-flow als het formulier
 * (sessionStorage-vlag + redirect naar /bedankt). Bij een mislukte upload
 * tonen we de fallback en blijft het formulier eronder gewoon bruikbaar.
 */
export function TekeningUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
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

  function kiesBestand(f: File | undefined) {
    if (!f) return;
    const err = valideerBestand(f);
    if (err) {
      setFile(null);
      setFout(err);
      return;
    }
    setFile(f);
    setFout(null);
  }

  async function verstuur() {
    if (!file || !contactGeldig || bezig) return;
    setBezig(true);
    setFout(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("naam", naam.trim());
      fd.append("email", email.trim());
      fd.append("telefoon", telefoon.trim());
      fd.append("website", website); // honeypot
      const res = await fetch("/api/offerte-upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && data?.ok) {
        // Zelfde conversie-moment als een formulier-submit.
        try {
          window.sessionStorage.setItem(OFFERTE_VERZONDEN_KEY, "1");
        } catch {}
        router.push("/bedankt");
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
        Heb je een IKEA-tekening? Stuur ’m mee voor de snelste vaste prijs
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Sleep je plan hierheen of tik om te kiezen — dan krijg je een exacte vaste prijs
        in plaats van een indicatie.
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
          kiesBestand(e.dataTransfer.files?.[0]);
        }}
        className={`mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          sleep
            ? "border-accent bg-accent-soft"
            : "border-line-strong bg-paper hover:border-accent"
        }`}
      >
        {file ? (
          <>
            <FileCheck2 className="text-trust" size={28} />
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              {file.name}
              <span
                role="button"
                tabIndex={0}
                aria-label="Bestand verwijderen"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="inline-grid h-5 w-5 place-items-center rounded-full bg-line text-ink-soft hover:bg-line-strong"
              >
                <X size={12} />
              </span>
            </span>
            <span className="text-xs text-muted">Klik om een ander bestand te kiezen</span>
          </>
        ) : (
          <>
            <UploadCloud className="text-accent" size={28} />
            <span className="text-sm font-semibold text-ink">Sleep je tekening hierheen of tik om te kiezen</span>
            <span className="text-xs text-muted">PDF, PNG of JPG · max 8 MB</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        className="sr-only"
        onChange={(e) => kiesBestand(e.target.files?.[0] ?? undefined)}
      />

      {/* Contactvelden — pas tonen zodra er een geldig bestand is gekozen */}
      {file && (
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

      {file && (
        <div className="mt-5">
          <Button onClick={verstuur} disabled={!contactGeldig || bezig} className="w-full sm:w-auto">
            {bezig ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Bezig met versturen…
              </>
            ) : (
              <>Verstuur tekening &amp; vraag vaste prijs aan</>
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
