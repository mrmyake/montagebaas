"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { KoppelStatus } from "@/lib/gmail/client";
import type { Analyse, AnalyseUitkomst, BestaandeAanvraag } from "@/lib/admin-offerte/server";
import { LEAD_BRONNEN, type LeadBron } from "@/lib/db.types";
import { parsePlannerLink } from "@/lib/ikea-planner/link";
import { TELVELDEN } from "@/lib/rekenen";
import { WERKBLAD_KEUZES, berekenOffertePrijs, effectiefWerkblad, type OffertePrijs, type WerkbladKeuze } from "@/lib/admin-offerte/prijs";
import { beoordeelVertrouwen, bepaalSignalen, type SignaalNiveau } from "@/lib/admin-offerte/signalen";
import { bedragTekst, bepaalOpenVragen, controleerMail, maakMail, onderwerpNieuw, type MailVariant } from "@/lib/admin-offerte/mail";
import { leesLinkActie, maakDraftActie, plaatsActie, slaOpActie, type DraftActieUitkomst } from "./actions";

const INPUT = "mt-1 w-full rounded border border-[var(--color-line-strong)] bg-white px-2 py-1.5 text-sm";
const LABEL = "block text-sm text-[var(--color-ink-soft)]";
const KNOP = "rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50";
const KNOP2 = "rounded border border-[var(--color-line-strong)] bg-white px-3 py-1.5 text-sm hover:border-[var(--color-accent)] disabled:opacity-50";
const PANEEL = "rounded border border-[var(--color-line)] bg-white p-4";
const KOP = "mb-2 text-sm font-semibold text-[var(--color-ink)]";

const NIVEAU: Record<SignaalNiveau, { label: string; klasse: string }> = {
  bestelfout: { label: "Bestelling", klasse: "border-red-300 bg-red-50 text-red-800" },
  buiten_scope: { label: "Buiten scope", klasse: "border-amber-300 bg-amber-50 text-amber-900" },
  let_op: { label: "Let op", klasse: "border-sky-300 bg-sky-50 text-sky-900" },
};
const BRON_LABEL: Record<LeadBron, string> = { website: "Website", werkspot: "Werkspot", doorverwijzing: "Doorverwijzing", overig: "Overig" };
const VARIANTEN: MailVariant[] = ["uitgebreid", "compact"];

export function OfferteTool({ gmail, melding }: { gmail: KoppelStatus; melding: { status: string; reden: string | null } | null }) {
  // ---- Invoer ----
  const [plannerUrl, setPlannerUrl] = useState("");
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [postcode, setPostcode] = useState("");
  const [plaats, setPlaats] = useState("");
  const plaatsHandmatig = useRef(false);
  const [werkbladKeuze, setWerkbladKeuze] = useState<WerkbladKeuze>("automatisch");
  const [oudeKeuken, setOudeKeuken] = useState(false);
  // Amsterdam (10xx) automatisch, tot Ilja de toggle zelf aanraakt.
  const [amsterdamHandmatig, setAmsterdamHandmatig] = useState<boolean | null>(null);
  const amsterdamAuto = /^\s*10\d{2}/.test(postcode);
  const amsterdam = amsterdamHandmatig ?? amsterdamAuto;
  const [bron, setBron] = useState<LeadBron>("website");

  // ---- Uitkomst ----
  const [analyse, setAnalyse] = useState<Analyse | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [pdfActief, setPdfActief] = useState(false);
  const [bezig, startBezig] = useTransition();
  const [vraagAan, setVraagAan] = useState<Record<string, boolean>>({});
  const [bewerkt, setBewerkt] = useState<Record<MailVariant, string | null>>({ uitgebreid: null, compact: null });
  const [drafts, setDrafts] = useState<(DraftActieUitkomst & { variant: MailVariant })[]>([]);
  const [draftIds, setDraftIds] = useState<number[]>([]);
  const [gmailKapot, setGmailKapot] = useState(false);
  const [opslag, setOpslag] = useState<{ bestaande?: BestaandeAanvraag[]; ok?: string; fout?: string } | null>(null);
  const [aanvraagId, setAanvraagId] = useState<string | null>(null);

  const linkGeldig = parsePlannerLink(plannerUrl).ok;

  // Plaats bij de postcode (voor het onderwerp), tot Ilja hem zelf invult.
  useEffect(() => {
    const pc = postcode.replace(/\s+/g, "");
    if (plaatsHandmatig.current || !/^\d{4}([A-Za-z]{2})?$/.test(pc)) return;
    const t = setTimeout(() => {
      plaatsActie(pc).then((p) => {
        if (p && !plaatsHandmatig.current) setPlaats(p);
      });
    }, 400);
    return () => clearTimeout(t);
  }, [postcode]);

  function nieuweAnalyse(u: AnalyseUitkomst) {
    if (!u.ok) {
      setAnalyse(null);
      setFout(u.melding);
      setPdfActief(true);
      return;
    }
    const a = u.analyse;
    setAnalyse(a);
    setFout(null);
    setBewerkt({ uitgebreid: null, compact: null });
    setDrafts([]);
    setOpslag(null);
    setAanvraagId(null);
    const vragen = bepaalOpenVragen({
      telling: a.telling,
      werkblad: a.werkbladGedetecteerd,
      eilandInhoud: a.eilandInhoud,
      metArtikellijst: a.artikelen.length > 0,
      afzuigOnduidelijk: bepaalSignalen({ ...a, werkblad: a.werkbladGedetecteerd }).some((s) => s.id.startsWith("afzuig")),
    });
    setVraagAan(Object.fromEntries(vragen.map((v) => [v.id, v.standaardAan])));
  }

  function leesLink() {
    setFout(null);
    startBezig(async () => nieuweAnalyse(await leesLinkActie(plannerUrl)));
  }

  function leesPdf(bestand: File) {
    setFout(null);
    startBezig(async () => {
      const form = new FormData();
      form.set("pdf", bestand);
      const res = await fetch("/admin/offerte/pdf", { method: "POST", body: form });
      nieuweAnalyse(
        res.headers.get("content-type")?.includes("json")
          ? ((await res.json()) as AnalyseUitkomst)
          : { ok: false, categorie: "pdf", melding: `PDF-route gaf ${res.status} (bestand te groot? max. 4,5 MB)` }
      );
    });
  }

  // ---- Afgeleid: prijs, signalen, mail ----
  const werkblad = analyse ? effectiefWerkblad(analyse.werkbladGedetecteerd, werkbladKeuze) : "geen";
  const prijs = useMemo((): { p?: OffertePrijs; fout?: string } => {
    if (!analyse) return {};
    try {
      return { p: berekenOffertePrijs(analyse.telling, analyse.tarieven.waarden, { werkblad, oudeKeuken }) };
    } catch (e) {
      return { fout: (e as Error).message };
    }
  }, [analyse, werkblad, oudeKeuken]);
  const signalen = useMemo(() => (analyse ? bepaalSignalen({ ...analyse, werkblad }) : []), [analyse, werkblad]);
  const vertrouwen = analyse ? beoordeelVertrouwen(analyse.telling, werkblad) : null;
  const vragen = useMemo(
    () =>
      analyse
        ? bepaalOpenVragen({
            telling: analyse.telling,
            werkblad,
            eilandInhoud: analyse.eilandInhoud,
            metArtikellijst: analyse.artikelen.length > 0,
            afzuigOnduidelijk: signalen.some((s) => s.id.startsWith("afzuig")),
          })
        : [],
    [analyse, werkblad, signalen]
  );
  const gegenereerd = useMemo((): Record<MailVariant, string> | null => {
    if (!analyse || !prijs.p) return null;
    const invoer = {
      naam,
      telling: analyse.telling,
      werkblad,
      eilandInhoud: analyse.eilandInhoud,
      compleet: prijs.p.compleet,
      montageklaar: prijs.p.montageklaar,
      oudeKeuken,
      amsterdam,
      vragen: vragen.filter((v) => vraagAan[v.id] ?? v.standaardAan),
    };
    return { uitgebreid: maakMail(invoer, "uitgebreid"), compact: maakMail(invoer, "compact") };
  }, [analyse, prijs.p, naam, werkblad, oudeKeuken, amsterdam, vragen, vraagAan]);
  const tekst = (v: MailVariant) => bewerkt[v] ?? gegenereerd?.[v] ?? "";

  function maakDraft(variant: MailVariant) {
    if (!analyse || !prijs.p) return;
    const p = prijs.p;
    startBezig(async () => {
      const u = await maakDraftActie({
        variant,
        tekst: tekst(variant),
        klantEmail: email,
        plaats,
        compleet: p.compleet,
        montageklaar: p.montageklaar,
        tarievenId: analyse.tarieven.id,
        plannerUuid: analyse.plannerUuid,
        aanvraagId,
      });
      setDrafts((d) => [{ ...u, variant }, ...d]);
      if (u.ok && u.draftRowId) setDraftIds((ids) => [...ids, u.draftRowId as number]);
      if (!u.ok && u.herkoppelen) setGmailKapot(true);
    });
  }

  function slaOp(koppelAan: string | null) {
    if (!analyse || !prijs.p) return;
    const p = prijs.p;
    startBezig(async () => {
      const u = await slaOpActie({
        naam,
        email,
        telefoon,
        postcode,
        bron,
        compleet: p.compleet,
        montageklaar: p.montageklaar,
        oudeKeuken,
        tarievenId: analyse.tarieven.id,
        plannerUuid: analyse.plannerUuid,
        leesToken: analyse.leesToken,
        tekeningPad: analyse.tekeningPad,
        draftIds,
        koppelAan,
      });
      if (u.ok) {
        setAanvraagId(u.aanvraagId);
        setOpslag({
          ok:
            (u.gekoppeld ? `Gekoppeld aan aanvraag ${u.aanvraagId.slice(0, 8)}` : `Opgeslagen als aanvraag ${u.aanvraagId.slice(0, 8)}`) +
            (u.statusGezet ? ", status Offerte verstuurd." : ", status ongewijzigd (lead staat al verder)."),
        });
      } else if ("bestaande" in u) setOpslag({ bestaande: u.bestaande });
      else setOpslag({ fout: u.fout });
    });
  }

  const gmailOk = gmail.gekoppeld && !gmailKapot;

  return (
    <div className="space-y-6">
      {melding && (
        <p className={`rounded border px-3 py-2 text-sm ${melding.status === "gekoppeld" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}>
          {melding.status === "gekoppeld" ? `Gmail gekoppeld (${gmail.account}).` : `Gmail koppelen mislukt: ${melding.reden ?? "onbekend"}`}
        </p>
      )}

      {/* ---------------- Invoer ---------------- */}
      <section className={`${PANEEL} grid gap-4 md:grid-cols-2`}>
        <label className={`${LABEL} md:col-span-2`}>
          IKEA planner-link *
          <div className="flex gap-2">
            <input
              className={INPUT}
              value={plannerUrl}
              onChange={(e) => setPlannerUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && linkGeldig && leesLink()}
              placeholder="https://kitchen.planner.ikea.com/nl/nl/planner/<UUID>/?ref=share"
            />
            <button type="button" className={`${KNOP} mt-1 whitespace-nowrap`} disabled={!linkGeldig || bezig} onClick={leesLink}>
              {bezig ? "Bezig…" : "Lees ontwerp"}
            </button>
          </div>
          {plannerUrl && !linkGeldig && <span className="text-xs text-red-600">Geen herkenbare planner-link.</span>}
        </label>
        <label className={LABEL}>
          Klantnaam
          <input className={INPUT} value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Voornaam (voor de aanhef)" />
        </label>
        <label className={LABEL}>
          Klant-e-mail (optioneel)
          <input className={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className={LABEL}>
          Postcode (optioneel)
          <input className={INPUT} value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="1234 AB" />
        </label>
        <label className={LABEL}>
          Plaats (voor het onderwerp)
          <input
            className={INPUT}
            value={plaats}
            onChange={(e) => {
              plaatsHandmatig.current = true;
              setPlaats(e.target.value);
            }}
          />
        </label>
        <label className={LABEL}>
          Werkblad
          <select className={INPUT} value={werkbladKeuze} onChange={(e) => setWerkbladKeuze(e.target.value as WerkbladKeuze)}>
            {WERKBLAD_KEUZES.map((k) => (
              <option key={k.waarde} value={k.waarde}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col justify-end gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={oudeKeuken} onChange={(e) => setOudeKeuken(e.target.checked)} />
            Oude keuken verwijderen meenemen
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={amsterdam}
              onChange={(e) => setAmsterdamHandmatig(e.target.checked)}
            />
            Amsterdam: parkeerkosten uitsluiten {amsterdamHandmatig === null && amsterdam && <span className="text-xs text-[var(--color-muted)]">(automatisch, 10xx)</span>}
          </label>
        </div>

        <details open={pdfActief} className="md:col-span-2">
          <summary className="cursor-pointer text-sm text-[var(--color-ink-soft)]">PDF-upload (terugval als de link niet te lezen is)</summary>
          <input
            type="file"
            accept="application/pdf"
            className="mt-2 text-sm"
            disabled={bezig}
            onChange={(e) => e.target.files?.[0] && leesPdf(e.target.files[0])}
          />
          <p className="mt-1 text-xs text-[var(--color-muted)]">Leest de PDF met de bestaande tekening-lezer (AI). Max. 4,5 MB.</p>
        </details>
      </section>

      {fout && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          <strong>Ontwerp niet gelezen.</strong> {fout} De PDF-upload hierboven staat open als terugval.
        </p>
      )}

      {analyse && (
        <>
          {/* ---------------- Telling + signalen ---------------- */}
          <div className="grid gap-4 md:grid-cols-2">
            <section className={PANEEL}>
              <h2 className={KOP}>
                Telling{" "}
                <span className="font-normal text-[var(--color-muted)]">
                  ({analyse.bron === "link" ? `planner, "${analyse.projectNaam ?? "?"}", opgeslagen ${analyse.datumOpgeslagen?.slice(0, 10) ?? "?"}` : `PDF ${analyse.projectNaam ?? ""}`}, {(analyse.duurMs / 1000).toFixed(1)} s)
                </span>
              </h2>
              {vertrouwen && (
                <p className="mb-2 text-sm">
                  Vertrouwen: <strong>{vertrouwen.vertrouwen}</strong>
                  {vertrouwen.redenen.length > 0 && <span className="text-[var(--color-muted)]"> ({vertrouwen.redenen.length} punt(en) hieronder)</span>}
                </p>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
                {TELVELDEN.filter((k) => (analyse.telling[k] as number) > 0).map((k) => (
                  <div key={k} className="flex justify-between border-b border-[var(--color-line)] py-0.5">
                    <dt className="text-[var(--color-ink-soft)]">{k.replace(/_/g, " ")}</dt>
                    <dd className="font-mono">{(analyse.telling[k] as number).toLocaleString("nl-NL")}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-sm">
                Werkblad: <strong>{werkblad.replace(/_/g, " ")}</strong>
                {werkbladKeuze !== "automatisch" && <span className="text-[var(--color-muted)]"> (override; ontwerp zegt {analyse.werkbladGedetecteerd.replace(/_/g, " ")})</span>}
              </p>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-[var(--color-ink-soft)]">Aannames ({analyse.telling.aannames.length})</summary>
                <ul className="mt-1 list-disc pl-5 text-[var(--color-ink-soft)]">
                  {analyse.telling.aannames.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </details>
            </section>

            <section className={PANEEL}>
              <h2 className={KOP}>Signalen (intern)</h2>
              {signalen.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">Geen signalen.</p>
              ) : (
                <ul className="space-y-2">
                  {signalen.map((s) => (
                    <li key={s.id} className={`rounded border px-2 py-1.5 text-sm ${NIVEAU[s.niveau].klasse}`}>
                      <span className="mr-1 text-xs font-semibold uppercase">{NIVEAU[s.niveau].label}</span> {s.tekst}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ---------------- Prijs ---------------- */}
          <section className={PANEEL}>
            <h2 className={KOP}>Prijs</h2>
            {prijs.fout && <p className="text-sm text-red-700">Geen prijs: {prijs.fout}</p>}
            {prijs.p && (
              <div className="flex flex-wrap items-start gap-8">
                <div>
                  <div className="text-xs uppercase text-[var(--color-muted)]">Compleet</div>
                  <div className="font-mono text-2xl">{bedragTekst(prijs.p.compleet)}</div>
                  <div className="text-xs text-[var(--color-muted)]">intern: {prijs.p.dagen.compleet.toLocaleString("nl-NL")} dagen</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-[var(--color-muted)]">Montageklaar</div>
                  <div className="font-mono text-2xl">{bedragTekst(prijs.p.montageklaar)}</div>
                  <div className="text-xs text-[var(--color-muted)]">intern: {prijs.p.dagen.montageklaar.toLocaleString("nl-NL")} dagen</div>
                </div>
                <div className="text-sm text-[var(--color-ink-soft)]">
                  <div>
                    Basis (schakel 2): {bedragTekst(prijs.p.basis.compleet.incl)} / {bedragTekst(prijs.p.basis.montageklaar.incl)}
                  </div>
                  {prijs.p.toeslagen.map((t) => (
                    <div key={t.sleutel}>
                      + {t.naam}: {bedragTekst(t.incl)}
                    </div>
                  ))}
                  <div className="text-xs text-[var(--color-muted)]">Tarievenrij {analyse.tarieven.id.slice(0, 8)}, incl. btw, afgerond omhoog op 25/75/95.</div>
                </div>
                <div
                  className={`rounded border px-2 py-1.5 text-sm ${prijs.p.verschilBinnenMarge ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}
                >
                  Verschil {bedragTekst(prijs.p.verschil)} = {(prijs.p.verschil / prijs.p.dagprijsIncl).toLocaleString("nl-NL", { maximumFractionDigits: 2 })}× dagtarief (
                  {bedragTekst(prijs.p.dagprijsIncl)}){prijs.p.verschilBinnenMarge ? "" : ": buiten 0,8–1,2, controleer de dagen."}
                </div>
              </div>
            )}
          </section>

          {/* ---------------- Mail ---------------- */}
          {gegenereerd && prijs.p && (
            <section className={PANEEL}>
              <h2 className={KOP}>Mail</h2>
              <div className="mb-3 text-sm">
                <div className="mb-1 text-[var(--color-ink-soft)]">Open vragen in de mail:</div>
                {vragen.map((v) => (
                  <label key={v.id} className="flex items-start gap-2 py-0.5">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={vraagAan[v.id] ?? v.standaardAan}
                      onChange={(e) => setVraagAan((s) => ({ ...s, [v.id]: e.target.checked }))}
                    />
                    <span>{v.tekst}</span>
                  </label>
                ))}
              </div>
              <p className="mb-2 text-xs text-[var(--color-muted)]">
                Onderwerp nieuwe draft: {onderwerpNieuw(plaats.trim() || null)}. Met klant-e-mail wordt het een reply in de laatste thread als die er is.
              </p>

              <div className="grid gap-4 lg:grid-cols-2">
                {VARIANTEN.map((v) => {
                  const problemen = controleerMail(tekst(v), { oudeKeuken, amsterdam });
                  return (
                    <div key={v}>
                      <div className="mb-1 flex items-center justify-between">
                        <h3 className="text-sm font-semibold capitalize">{v}</h3>
                        {bewerkt[v] !== null && (
                          <button type="button" className="text-xs text-[var(--color-accent)] underline" onClick={() => setBewerkt((b) => ({ ...b, [v]: null }))}>
                            Terug naar gegenereerde tekst
                          </button>
                        )}
                      </div>
                      <textarea
                        className="h-96 w-full rounded border border-[var(--color-line-strong)] p-2 font-mono text-xs leading-relaxed"
                        value={tekst(v)}
                        onChange={(e) => setBewerkt((b) => ({ ...b, [v]: e.target.value }))}
                      />
                      {problemen.length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-xs text-red-700">
                          {problemen.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" className={KNOP2} onClick={() => navigator.clipboard.writeText(tekst(v))}>
                          Kopieer
                        </button>
                        <button type="button" className={KNOP} disabled={!gmailOk || bezig} onClick={() => maakDraft(v)}>
                          Maak Gmail-draft ({v})
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 space-y-1 text-sm">
                {!gmailOk && (
                  <p className="text-[var(--color-ink-soft)]">
                    {gmail.gekoppeld ? "De Gmail-koppeling is verlopen of ingetrokken." : "Gmail is nog niet gekoppeld."} De tekst blijft kopieerbaar.{" "}
                    <a className={KNOP2} href="/admin/offerte/gmail/connect">
                      {gmail.gekoppeld ? "Opnieuw koppelen" : "Koppel Gmail"}
                    </a>
                  </p>
                )}
                {drafts.map((d, i) =>
                  d.ok ? (
                    <p key={i} className="text-green-800">
                      Draft ({d.variant}) gemaakt{d.reply ? " als reply" : ""}: “{d.onderwerp}”.{" "}
                      <a className="underline" href={d.link} target="_blank" rel="noreferrer">
                        Open in Gmail
                      </a>
                    </p>
                  ) : (
                    <p key={i} className="text-red-700">
                      Draft ({d.variant}) mislukt: {d.fout}{" "}
                      {d.herkoppelen && (
                        <a className="underline" href="/admin/offerte/gmail/connect">
                          Opnieuw koppelen
                        </a>
                      )}
                    </p>
                  )
                )}
              </div>
            </section>
          )}

          {/* ---------------- Opslaan ---------------- */}
          {prijs.p && (
            <section className={`${PANEEL} space-y-3`}>
              <h2 className={KOP}>Opslaan als aanvraag</h2>
              <div className="flex flex-wrap items-end gap-3">
                <label className={LABEL}>
                  Telefoon (optioneel)
                  <input className={INPUT} value={telefoon} onChange={(e) => setTelefoon(e.target.value)} />
                </label>
                <label className={LABEL}>
                  Bron
                  <select className={INPUT} value={bron} onChange={(e) => setBron(e.target.value as LeadBron)}>
                    {LEAD_BRONNEN.map((b) => (
                      <option key={b} value={b}>
                        {BRON_LABEL[b]}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className={KNOP} disabled={bezig || !naam.trim() || !!aanvraagId} onClick={() => slaOp(null)}>
                  Opslaan als aanvraag
                </button>
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                Status Offerte verstuurd, offertebedrag {bedragTekst(prijs.p.compleet)} (Compleet). Gaat niet als aanvraag_ontvangen naar Google Ads.
              </p>
              {opslag?.ok && <p className="text-sm text-green-800">{opslag.ok}</p>}
              {opslag?.fout && <p className="text-sm text-red-700">{opslag.fout}</p>}
              {opslag?.bestaande && (
                <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="mb-2">Er bestaat al een aanvraag met dit e-mailadres of dit ontwerp. Hoort de offerte daarbij?</p>
                  <ul className="space-y-1">
                    {opslag.bestaande.map((b) => (
                      <li key={b.id} className="flex flex-wrap items-center gap-2">
                        <span>
                          {b.naam} ({b.email || "geen e-mail"}), {new Date(b.created_at).toLocaleDateString("nl-NL")}, {b.lead_status}
                          {b.offerte_bedrag ? `, offerte ${bedragTekst(Number(b.offerte_bedrag))}` : ""}, match op {b.match.join(" en ")}
                        </span>
                        <button type="button" className={KNOP2} disabled={bezig} onClick={() => slaOp(b.id)}>
                          Ja, koppel aan deze
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="mt-2 text-xs underline" onClick={() => setOpslag(null)}>
                    Nee, niet opslaan
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
