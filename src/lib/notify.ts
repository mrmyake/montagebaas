import { euro } from "@/lib/pricing";
import { site, whatsappDefault, whatsappUrl } from "@/lib/site";
import type { Invoermethode, PlannerStatus } from "@/lib/db.types";
import { PLANNER_FOUT_UITLEG } from "@/lib/ikea-planner/fouten";
import { herinneringTekst, type KlusZonderDagen } from "@/lib/werkelijke-dagen";

/**
 * Stuurt een lead-notificatie per e-mail via Resend (https://resend.com).
 * Bewust via fetch i.p.v. de SDK zodat het optioneel en licht is. Als de key ontbreekt
 * of de call faalt, wordt dit gelogd maar NOOIT gegooid — de lead is al opgeslagen en mag
 * niet verloren gaan (ntfy-push gaat sowieso door).
 *
 * Eigen Resend-account voor montagebaas; afzenderdomein montagebaas.com is geverifieerd.
 * reply_to = het e-mailadres van de lead, zodat je direct kunt antwoorden.
 */

interface LeadNotificatie {
  id: string;
  naam: string;
  telefoon: string;
  email: string;
  type_klus: string;
  aantal_kasten_range: string;
  opstelling: string;
  extras: string[];
  prijs_indicatie_min: number;
  prijs_indicatie_max: number;
  postcode: string;
  regio: string | null;
  gewenste_periode: string;
  toelichting: string | null;
}

export async function stuurLeadNotificatie(lead: LeadNotificatie): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_TO;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.warn(
      `[lead] Geen e-mailnotificatie verstuurd (RESEND_API_KEY, LEAD_NOTIFY_TO of RESEND_FROM_EMAIL ontbreekt). Lead ${lead.id} staat wel in de database.`
    );
    return;
  }

  const rij = (label: string, waarde: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7178">${label}</td><td style="padding:4px 0;font-weight:600">${waarde}</td></tr>`;

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#1a1c20">
      <h2 style="margin:0 0 4px">Nieuwe offerteaanvraag</h2>
      <p style="margin:0 0 16px;color:#6b7178">Lead-ID: ${lead.id}</p>
      <table style="border-collapse:collapse;font-size:14px">
        ${rij("Methode", "formulier")}
        ${rij("Naam", lead.naam)}
        ${rij("Telefoon", lead.telefoon)}
        ${rij("E-mail", lead.email)}
        ${rij("Postcode", lead.postcode)}
        ${rij("Regio", lead.regio ?? "—")}
        ${rij("Type klus", lead.type_klus)}
        ${rij("Grootte", lead.aantal_kasten_range)}
        ${rij("Opstelling", lead.opstelling)}
        ${rij("Extra's", lead.extras.length ? lead.extras.join(", ") : "geen")}
        ${rij("Gewenste periode", lead.gewenste_periode)}
        ${rij("Prijsindicatie", `${euro(lead.prijs_indicatie_min)} – ${euro(lead.prijs_indicatie_max)}`)}
        ${rij("Toelichting", lead.toelichting ?? "—")}
      </table>
    </div>`;

  const text = [
    `Nieuwe offerteaanvraag (lead ${lead.id})`,
    `Methode: formulier`,
    `Naam: ${lead.naam}`,
    `Telefoon: ${lead.telefoon}`,
    `E-mail: ${lead.email}`,
    `Postcode: ${lead.postcode} (${lead.regio ?? "—"})`,
    `Type: ${lead.type_klus} | ${lead.aantal_kasten_range} | ${lead.opstelling}`,
    `Extra's: ${lead.extras.length ? lead.extras.join(", ") : "geen"}`,
    `Periode: ${lead.gewenste_periode}`,
    `Indicatie: ${euro(lead.prijs_indicatie_min)} – ${euro(lead.prijs_indicatie_max)}`,
    `Toelichting: ${lead.toelichting ?? "—"}`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: lead.email,
        subject: `Nieuwe offerteaanvraag — ${lead.naam} (${lead.postcode})`,
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error(`[lead] Resend gaf status ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("[lead] E-mailnotificatie mislukt:", err);
  }
}

/**
 * Stuurt de KLANT een vriendelijke bevestiging van zijn offerteaanvraag.
 * Best-effort, identiek aan de owner-notificatie: faalt nooit hard.
 * reply_to wijst naar de eigenaar (LEAD_NOTIFY_TO) zodat klantreacties bij jou komen.
 */
export async function stuurKlantBevestiging(lead: LeadNotificatie): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.LEAD_NOTIFY_TO ?? site.email;

  if (!apiKey || !from || !lead.email) {
    console.warn(
      `[lead] Geen klantbevestiging verstuurd (RESEND_API_KEY/RESEND_FROM_EMAIL/e-mail ontbreekt). Lead ${lead.id} staat wel in de database.`
    );
    return;
  }

  const voornaam = lead.naam.split(/\s+/)[0] || lead.naam;

  const rij = (label: string, waarde: string) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#6b7178">${label}</td><td style="padding:4px 0;font-weight:600">${waarde}</td></tr>`;

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#1a1c20;max-width:560px">
      <h2 style="margin:0 0 4px">Bedankt voor je aanvraag, ${voornaam}!</h2>
      <p style="margin:0 0 16px;color:#3a3f47;line-height:1.5">
        We hebben je aanvraag voor het plaatsen van je IKEA-keuken goed ontvangen.
        Je hoort <strong>binnen 24 uur</strong> van ons met een exacte offerte op maat.
      </p>
      <p style="margin:0 0 8px;font-weight:600">Je aanvraag in het kort</p>
      <table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">
        ${rij("Type klus", lead.type_klus)}
        ${rij("Grootte", lead.aantal_kasten_range)}
        ${rij("Opstelling", lead.opstelling)}
        ${rij("Extra's", lead.extras.length ? lead.extras.join(", ") : "geen")}
        ${rij("Gewenste periode", lead.gewenste_periode)}
        ${rij("Locatie", `${lead.postcode}${lead.regio ? ` (${lead.regio})` : ""}`)}
      </table>
      <p style="margin:0 0 4px;color:#6b7178;font-size:14px">Voorlopige prijsindicatie</p>
      <p style="margin:0 0 4px;font-size:20px;font-weight:700">
        ${euro(lead.prijs_indicatie_min)} – ${euro(lead.prijs_indicatie_max)}
      </p>
      <p style="margin:0 0 20px;color:#6b7178;font-size:13px">
        Dit is een indicatie op basis van je keuzes. Je definitieve offerte op maat volgt binnen 24 uur.
      </p>
      <p style="margin:0 0 16px;color:#3a3f47;font-size:14px;line-height:1.5">
        Heb je je keuken al ontworpen in de IKEA Keukenplanner? Stuur ons dan de <strong>deellink</strong> van je ontwerp
        (of de artikellijst) door op deze mail te reageren, dan rekenen we met je eigen plan.
      </p>
      <p style="margin:0 0 8px;line-height:1.6">
        Liever direct contact? Bel <a href="${site.telefoonLink}" style="color:#1a1c20;font-weight:600">${site.telefoonWeergave}</a>
        of <a href="${whatsappDefault}" style="color:#1a1c20;font-weight:600">app ons via WhatsApp</a>.
      </p>
      <p style="margin:20px 0 0;color:#6b7178;font-size:13px">
        Met vriendelijke groet,<br/>${site.naam}
      </p>
    </div>`;

  const text = [
    `Bedankt voor je aanvraag, ${voornaam}!`,
    "",
    "We hebben je aanvraag voor het plaatsen van je IKEA-keuken ontvangen.",
    "Je hoort binnen 24 uur van ons met een exacte offerte op maat.",
    "",
    "Je aanvraag in het kort:",
    `- Type klus: ${lead.type_klus}`,
    `- Grootte: ${lead.aantal_kasten_range}`,
    `- Opstelling: ${lead.opstelling}`,
    `- Extra's: ${lead.extras.length ? lead.extras.join(", ") : "geen"}`,
    `- Gewenste periode: ${lead.gewenste_periode}`,
    `- Locatie: ${lead.postcode}${lead.regio ? ` (${lead.regio})` : ""}`,
    "",
    `Voorlopige prijsindicatie: ${euro(lead.prijs_indicatie_min)} – ${euro(lead.prijs_indicatie_max)}`,
    "Dit is een indicatie; je definitieve offerte volgt binnen 24 uur.",
    "",
    "Heb je je keuken al ontworpen in de IKEA Keukenplanner? Stuur ons de deellink van je ontwerp (of de artikellijst) door op deze mail te reageren, dan rekenen we met je eigen plan.",
    "",
    `Liever direct contact? Bel ${site.telefoonWeergave} of app ons via WhatsApp.`,
    "",
    `Met vriendelijke groet, ${site.naam}`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [lead.email],
        reply_to: replyTo,
        subject: `Bedankt voor je aanvraag bij ${site.naam}`,
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error(`[lead] Resend (klantbevestiging) gaf status ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("[lead] Klantbevestiging mislukt:", err);
  }
}

interface TekeningIndicatieBasis {
  aanvraagId: string;
  naam: string;
  telefoon: string;
  email: string;
  bestandsnaam: string;
  pad: string; // Storage-pad, als fallback getoond wanneer attachments ontbreekt (te groot)
  attachments?: { filename: string; content: string }[]; // content = base64
  methode?: Invoermethode;
  planner?: PlannerNotitie; // gezet als er ook een (onleesbare) planner-link was
}

type TekeningIndicatieNotificatie =
  | (TekeningIndicatieBasis & { status: "controle"; ontbrekend: string[] })
  | (TekeningIndicatieBasis & {
      status: "berekend" | "indicatie";
      min: number;
      max: number;
      vertrouwen: string;
      aannames: string[];
    });

/**
 * Interne notificatie naar de eigenaar voor een aanvraag via tekening-upload —
 * gecombineerd: contactgegevens + geüploade bestanden (als bijlage) + het resultaat
 * van de AI-lezing (prijsindicatie/vertrouwen/aannames), of "handmatige controle
 * nodig" als de lezing/validatie faalde. Eén mail, verstuurd ná de AI-lezing
 * (schakel 2) zodat alles er meteen in staat. Mirror van de ntfy-push in
 * tekening-verwerker.ts.
 */
export async function stuurTekeningIndicatieNotificatie(
  input: TekeningIndicatieNotificatie
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_TO;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.warn(`[lead] Geen indicatie-e-mail verstuurd; lead ${input.aanvraagId} staat wel in de database.`);
    return;
  }

  const subject =
    input.status === "controle"
      ? `Tekening: handmatige controle nodig — ${input.naam}`
      : input.status === "berekend"
        ? `Nieuwe aanvraag mét tekening — prijs berekend — ${input.naam}`
        : `Nieuwe aanvraag mét tekening — indicatie (vertrouwen ${input.vertrouwen}) — ${input.naam}`;

  const rij = (label: string, waarde: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7178">${label}</td><td style="padding:4px 0;font-weight:600">${waarde}</td></tr>`;
  const contactTabel = `
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">
      ${input.methode ? rij("Methode", input.methode) : ""}
      ${input.planner ? rij("Planner-link", plannerLinkHtml(input.planner)) : ""}
      ${rij("Naam", input.naam)}
      ${rij("Telefoon", input.telefoon)}
      ${rij("E-mail", input.email)}
      ${rij("Tekening", input.bestandsnaam)}
    </table>
    ${input.planner ? `<p style="margin:0 0 16px">${plannerStatusHtml(input.planner)} Hieronder de AI-lezing van de meegestuurde bestanden.</p>` : ""}`;
  const lijst = (items: string[]) => items.map((a) => `<li>${a}</li>`).join("");
  // Bijlage ontbreekt alleen als het bestand te groot was (zie MAX_ATTACHMENT_BYTES) —
  // dan blijft de Storage-locatie als enige manier om erbij te kunnen.
  const padFallbackHtml = input.attachments?.length
    ? ""
    : `<p style="margin:8px 0 0;font-size:13px;color:#6b7178">Bijlage te groot om mee te sturen — bestand in Storage (bucket <strong>offerte-tekeningen</strong>): <code>${input.pad}</code></p>`;
  const padFallbackText = input.attachments?.length
    ? []
    : [`Bijlage te groot om mee te sturen — pad: offerte-tekeningen/${input.pad}`];

  const html =
    input.status === "controle"
      ? `<div style="font-family:Inter,Arial,sans-serif;color:#1a1c20">
           <h2 style="margin:0 0 4px">Tekening: handmatige controle nodig</h2>
           <p style="margin:0 0 16px;color:#6b7178">Lead-ID: ${input.aanvraagId}</p>
           ${contactTabel}
           <p style="margin:0">Telling onvolledig, ontbrekend: <strong>${input.ontbrekend.join(", ")}</strong></p>
           <p style="margin:8px 0 0;color:#6b7178">Geen indicatie getoond aan de klant; beoordeel de tekening zelf.</p>
           ${padFallbackHtml}
         </div>`
      : `<div style="font-family:Inter,Arial,sans-serif;color:#1a1c20">
           <h2 style="margin:0 0 4px">${input.status === "berekend" ? "Prijs berekend (hoog vertrouwen)" : `Indicatie (vertrouwen ${input.vertrouwen})`}</h2>
           <p style="margin:0 0 16px;color:#6b7178">Lead-ID: ${input.aanvraagId}</p>
           ${contactTabel}
           <p style="margin:0 0 4px;font-size:20px;font-weight:700">${euro(input.min)} – ${euro(input.max)}</p>
           <p style="margin:0 0 8px;color:#6b7178">Vertrouwen: ${input.vertrouwen}</p>
           <p style="margin:0 0 4px;font-weight:600">Aannames</p>
           <ul style="margin:0 0 12px;padding-left:18px;font-size:14px;color:#3a3f47">${lijst(input.aannames)}</ul>
           <p style="margin:0;color:#6b7178">${input.status === "berekend" ? "Controleer en stuur de exacte offerte." : "Klant is per mail gevraagd de IKEA-artikellijst te sturen voor een exacte prijs."}</p>
           ${padFallbackHtml}
         </div>`;

  const text =
    input.status === "controle"
      ? [
          `Tekening: handmatige controle nodig (lead ${input.aanvraagId})`,
          ...plannerTekstRegels(input.methode, input.planner),
          `Naam: ${input.naam}`,
          `Telefoon: ${input.telefoon}`,
          `E-mail: ${input.email}`,
          `Tekening: ${input.bestandsnaam}`,
          `Ontbrekend: ${input.ontbrekend.join(", ")}`,
          `Geen indicatie getoond aan de klant; beoordeel de tekening zelf.`,
          ...padFallbackText,
        ].join("\n")
      : [
          `${input.status === "berekend" ? "Prijs berekend (hoog vertrouwen)" : `Indicatie (vertrouwen ${input.vertrouwen})`} — lead ${input.aanvraagId}`,
          ...plannerTekstRegels(input.methode, input.planner),
          `Naam: ${input.naam}`,
          `Telefoon: ${input.telefoon}`,
          `E-mail: ${input.email}`,
          `Tekening: ${input.bestandsnaam}`,
          `Indicatie: ${euro(input.min)} – ${euro(input.max)}`,
          `Vertrouwen: ${input.vertrouwen}`,
          `Aannames:`,
          ...input.aannames.map((a) => `- ${a}`),
          input.status === "berekend"
            ? "Controleer en stuur de exacte offerte."
            : "Klant is per mail gevraagd de IKEA-artikellijst te sturen voor een exacte prijs.",
          ...padFallbackText,
        ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: input.email,
        ...(input.attachments?.length ? { attachments: input.attachments } : {}),
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) console.error(`[lead] Resend (tekening-indicatie) status ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error("[lead] Indicatie-e-mail mislukt:", err);
  }
}

/**
 * Bevestiging naar de klant voor een aanvraag via tekening-upload. Wordt ná de
 * AI-lezing verstuurd (vanuit de verwerker), zodat de indicatieprijs erin kan.
 * Met `prijs` → toont de range + disclaimer (sterker bij `ruw`); zonder `prijs`
 * (lezing mislukt) → "exacte prijs volgt binnen 24 uur", geen bedrag.
 */
export async function stuurTekeningKlantBevestiging(klant: {
  naam: string;
  email: string;
  prijs?: { min: number; max: number; ruw: boolean };
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.LEAD_NOTIFY_TO ?? site.email;
  if (!apiKey || !from || !klant.email) return;

  const voornaam = klant.naam.split(/\s+/)[0] || klant.naam;
  const p = klant.prijs;
  const artikellijstWa = whatsappUrl(
    "Hoi Montagebaas, hier is de deellink of artikellijst van mijn IKEA-keukenontwerp."
  );

  const disclaimer = p?.ruw
    ? "Dit is een rúwe indicatie: je hebt alleen een tekening geüpload en die was lastig automatisch te lezen, dus we kennen nog niet alle exacte elementen."
    : "Dit is een indicatie op basis van je geüploade tekening; we kennen nog niet alle exacte elementen, dus de definitieve prijs kan afwijken.";

  const prijsBlokHtml = p
    ? `<div style="margin:0 0 12px;padding:14px 16px;background:#f4f1ea;border-radius:12px">
         <div style="font-size:13px;color:#6b7178">Indicatie op basis van je tekening</div>
         <div style="font-size:22px;font-weight:700;margin-top:2px">${euro(p.min)} – ${euro(p.max)}</div>
       </div>
       <p style="margin:0 0 16px;color:#6b7178;font-size:13px;line-height:1.5">${disclaimer}</p>`
    : `<p style="margin:0 0 16px;color:#3a3f47;line-height:1.5">Bedankt! We hebben je IKEA-tekening goed ontvangen.</p>`;

  // Voor beide gevallen dezelfde, eerlijke belofte — geen huiswerk voor de klant.
  const beloofteHtml = `<p style="margin:0 0 16px;color:#1a1c20;line-height:1.6">We nemen <strong>binnen 24 uur</strong> contact met je op voor je exacte vaste prijs op maat.</p>`;

  // Alleen bij lage zekerheid: optionele versneller (niet verplicht).
  const versnellerHtml = p?.ruw
    ? `<div style="margin:0 0 16px;padding:14px 16px;background:#fbf7ee;border:1px solid #ece3cf;border-radius:12px">
         <p style="margin:0 0 6px;font-weight:600">Sneller een exacte prijs?</p>
         <p style="margin:0;font-size:14px;line-height:1.5;color:#3a3f47">Stuur ons de <strong>deellink van je ontwerp</strong> uit de IKEA Keukenplanner (Opslaan → Delen → Link kopiëren), of je <strong>artikellijst</strong> (de lijst met artikelnummers), en eventueel een paar foto&apos;s van de ruimte — dan maken we de prijs op de euro nauwkeurig. Reageer op deze mail of <a href="${artikellijstWa}" style="color:#1a1c20;font-weight:600">stuur 'm via WhatsApp</a>.</p>
       </div>`
    : "";

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#1a1c20;max-width:560px">
      <h2 style="margin:0 0 12px">Plan ontvangen, ${voornaam} ✅</h2>
      ${prijsBlokHtml}
      ${beloofteHtml}
      ${versnellerHtml}
      <p style="margin:0 0 8px;line-height:1.6">
        Liever direct contact? Bel <a href="${site.telefoonLink}" style="color:#1a1c20;font-weight:600">${site.telefoonWeergave}</a>
        of <a href="${whatsappDefault}" style="color:#1a1c20;font-weight:600">app ons via WhatsApp</a>.
      </p>
      <p style="margin:20px 0 0;color:#6b7178;font-size:13px">Met vriendelijke groet,<br/>${site.naam}</p>
    </div>`;

  const text = [
    `Plan ontvangen, ${voornaam}!`,
    "",
    p
      ? `Indicatie op basis van je tekening: ${euro(p.min)} – ${euro(p.max)}`
      : "We hebben je IKEA-tekening ontvangen.",
    p ? disclaimer : "",
    "We nemen binnen 24 uur contact met je op voor je exacte vaste prijs op maat.",
    p?.ruw
      ? "Sneller een exacte prijs? Stuur de deellink van je ontwerp uit de IKEA Keukenplanner of je artikellijst (lijst met artikelnummers) + eventueel een paar foto's — reageer op deze mail of app ons via WhatsApp."
      : "",
    "",
    `Liever direct contact? Bel ${site.telefoonWeergave} of app ons via WhatsApp.`,
    "",
    `Met vriendelijke groet, ${site.naam}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [klant.email],
        reply_to: replyTo,
        subject: p
          ? `Je prijsindicatie voor je IKEA-keuken`
          : `Plan ontvangen — je vaste prijs volgt binnen 24 uur`,
        html,
        text,
      }),
    });
    if (!res.ok) console.error(`[lead] Resend (tekening-klant) status ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error("[lead] Klantbevestiging (tekening) mislukt:", err);
  }
}

// ---------------------------------------------------------------------------
// Planner-link (IKEA Keukenplanner-deellink als invoer)
// ---------------------------------------------------------------------------

export interface PlannerNotitie {
  url: string; // genormaliseerde deellink
  status: PlannerStatus;
  foutDetail?: string | null; // technische reden, alleen intern
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function plannerLinkHtml(p: PlannerNotitie): string {
  return `<a href="${esc(p.url)}" style="color:#1a1c20">${esc(p.url)}</a>`;
}

function plannerStatusZin(p: PlannerNotitie): string {
  if (p.status === "ok") return "Link uitgelezen ✓";
  return `Link NIET uit te lezen: ${p.status} — ${PLANNER_FOUT_UITLEG[p.status]}`;
}

function plannerStatusHtml(p: PlannerNotitie): string {
  const kleur = p.status === "ok" ? "#1f7a4d" : "#b3261e";
  const detail = p.foutDetail ? ` <span style="color:#6b7178;font-size:12px">(${esc(p.foutDetail.slice(0, 200))})</span>` : "";
  return `<strong style="color:${kleur}">${esc(plannerStatusZin(p))}</strong>${detail}`;
}

function plannerTekstRegels(methode?: Invoermethode, p?: PlannerNotitie): string[] {
  return [
    ...(methode ? [`Methode: ${methode}`] : []),
    ...(p ? [`Planner-link: ${p.url}`, plannerStatusZin(p) + (p.foutDetail ? ` (${p.foutDetail.slice(0, 200)})` : "")] : []),
  ];
}

async function verstuurViaResend(body: Record<string, unknown>, label: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error(`[lead] Resend (${label}) status ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error(`[lead] ${label} mislukt:`, err);
  }
}

export interface PakketRegel {
  dagen: number;
  incl: number; // incl. btw, zoals berekend door schakel 2 (+ eventuele toeslag)
}

export interface PlannerNotificatie {
  aanvraagId: string;
  naam: string;
  telefoon: string;
  email: string;
  planner: PlannerNotitie;
  bestandsnaam?: string; // als er ook bestanden zijn meegestuurd
  attachments?: { filename: string; content: string }[];
  // Alleen bij status ok:
  ontwerp?: {
    projectNaam: string | null;
    datumOpgeslagen: string | null;
    datumAangemaakt: string | null;
    vergrendeld: boolean | null;
    bomSha256: string | null;
  };
  prijs?: {
    montageklaar: PakketRegel;
    compleet: PakketRegel;
    toeslag: number; // al inbegrepen in de bedragen hierboven (laminaat op locatie zagen)
  };
  telling?: Record<string, number>; // alleen de velden ≠ 0
  aannames?: string[];
  artikelen?: { aantal: number; artikelnummer: string; naam: string; omschrijving: string }[];
}

const KALIBRATIE_WAARSCHUWING = "Dagenmodel 2026-10, indicatie. Controleer altijd.";

/**
 * Notificatie aan de eigenaar voor een aanvraag via planner-link: methode, de
 * klikbare link, de status, en bij succes de telling + berekende prijs (niet
 * aan de klant getoond). Bij een fout duidelijk waarom de link niet te lezen was.
 */
export async function stuurPlannerNotificatie(input: PlannerNotificatie): Promise<void> {
  const to = process.env.LEAD_NOTIFY_TO;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !to || !from) {
    console.warn(`[lead] Geen planner-e-mail verstuurd; lead ${input.aanvraagId} staat wel in de database.`);
    return;
  }

  const ok = input.planner.status === "ok";
  const subject = ok
    ? `Nieuwe aanvraag via planner-link — ${input.naam}`
    : `Planner-link NIET uit te lezen (${input.planner.status}) — ${input.naam}`;

  const rij = (label: string, waarde: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7178;vertical-align:top">${label}</td><td style="padding:4px 0;font-weight:600">${waarde}</td></tr>`;
  const datum = (d: string | null | undefined) => (d ? d.slice(0, 10) : "—");

  const o = input.ontwerp;
  const p = input.prijs;
  const toeslagZin = p?.toeslag
    ? `Inclusief €${p.toeslag} toeslag laminaat werkblad op locatie zagen (halve dag).`
    : "";

  const kopHtml = `
    <h2 style="margin:0 0 4px">${ok ? "Aanvraag via IKEA planner-link" : "Planner-link niet uit te lezen"}</h2>
    <p style="margin:0 0 16px;color:#6b7178">Lead-ID: ${input.aanvraagId}</p>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">
      ${rij("Methode", "link")}
      ${rij("Planner-link", plannerLinkHtml(input.planner))}
      ${rij("Status", plannerStatusHtml(input.planner))}
      ${rij("Naam", esc(input.naam))}
      ${rij("Telefoon", esc(input.telefoon))}
      ${rij("E-mail", esc(input.email))}
      ${input.bestandsnaam ? rij("Bestanden", esc(input.bestandsnaam)) : ""}
    </table>`;

  const okHtml = ok
    ? `
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">
      ${rij("Ontwerp", esc(o?.projectNaam ?? "—"))}
      ${rij("Laatst opgeslagen", datum(o?.datumOpgeslagen))}
      ${rij("Aangemaakt", datum(o?.datumAangemaakt))}
      ${rij("Vergrendeld", o?.vergrendeld === null || o?.vergrendeld === undefined ? "—" : o.vergrendeld ? "ja" : "nee")}
      ${rij("BOM-hash", `<code>${(o?.bomSha256 ?? "—").slice(0, 12)}</code>`)}
    </table>
    ${
      p
        ? `<div style="margin:0 0 16px;padding:14px 16px;background:#f4f1ea;border-radius:12px">
             <div style="font-size:14px">Montageklaar (${p.montageklaar.dagen} d): <strong>${euro(p.montageklaar.incl)}</strong></div>
             <div style="font-size:14px">Compleet (${p.compleet.dagen} d): <strong>${euro(p.compleet.incl)}</strong></div>
             ${toeslagZin ? `<div style="font-size:13px;margin-top:6px">${toeslagZin}</div>` : ""}
             <div style="font-size:13px;margin-top:6px;color:#b3261e"><strong>${KALIBRATIE_WAARSCHUWING}</strong> Niet aan de klant getoond.</div>
           </div>`
        : ""
    }
    <p style="margin:0 0 4px;font-weight:600">Telling</p>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:12px">
      ${Object.entries(input.telling ?? {}).map(([k, v]) => rij(k, String(v))).join("")}
    </table>
    <p style="margin:0 0 4px;font-weight:600">Aannames</p>
    <ul style="margin:0 0 12px;padding-left:18px;font-size:14px;color:#3a3f47">${(input.aannames ?? []).map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
    <p style="margin:0 0 4px;font-weight:600">Artikellijst (${input.artikelen?.length ?? 0} regels)</p>
    <table style="border-collapse:collapse;font-size:12px;color:#3a3f47">
      ${(input.artikelen ?? []).map((a) => `<tr><td style="padding:1px 8px 1px 0;text-align:right">${a.aantal}×</td><td style="padding:1px 8px 1px 0">${a.artikelnummer}</td><td>${esc(`${a.naam} ${a.omschrijving}`)}</td></tr>`).join("")}
    </table>`
    : `<p style="margin:0">${
        input.planner.status === "niet_gevonden"
          ? "De klant is in de bevestigingsmail gevraagd of het ontwerp is opgeslagen en gedeeld, en om een nieuwe deellink of de PDF met artikellijst."
          : "De klant heeft de normale bevestiging gekregen, met de vraag de PDF (artikellijst) te sturen."
      } Geen telling of prijs.</p>`;

  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#1a1c20">${kopHtml}${okHtml}</div>`;

  const text = [
    `${ok ? "Aanvraag via IKEA planner-link" : "Planner-link NIET uit te lezen"} (lead ${input.aanvraagId})`,
    ...plannerTekstRegels("link", input.planner),
    `Naam: ${input.naam}`,
    `Telefoon: ${input.telefoon}`,
    `E-mail: ${input.email}`,
    ...(input.bestandsnaam ? [`Bestanden: ${input.bestandsnaam}`] : []),
    "",
    ...(ok
      ? [
          `Ontwerp: ${o?.projectNaam ?? "—"} (laatst opgeslagen ${datum(o?.datumOpgeslagen)}, hash ${(o?.bomSha256 ?? "—").slice(0, 12)})`,
          ...(p
            ? [
                `Montageklaar (${p.montageklaar.dagen} d): ${euro(p.montageklaar.incl)}`,
                `Compleet (${p.compleet.dagen} d): ${euro(p.compleet.incl)}`,
                ...(toeslagZin ? [toeslagZin] : []),
                `${KALIBRATIE_WAARSCHUWING} Niet aan de klant getoond.`,
              ]
            : []),
          "",
          "Telling:",
          ...Object.entries(input.telling ?? {}).map(([k, v]) => `- ${k}: ${v}`),
          "",
          "Aannames:",
          ...(input.aannames ?? []).map((a) => `- ${a}`),
          "",
          `Artikellijst (${input.artikelen?.length ?? 0} regels):`,
          ...(input.artikelen ?? []).map((a) => `${a.aantal}× ${a.artikelnummer} ${a.naam} ${a.omschrijving}`),
        ]
      : [
          input.planner.status === "niet_gevonden"
            ? "Klant is gevraagd of het ontwerp is opgeslagen en gedeeld (nieuwe deellink of PDF)."
            : "Klant is gevraagd de PDF (artikellijst) te sturen.",
        ]),
  ].join("\n");

  await verstuurViaResend(
    {
      from,
      to: [to],
      reply_to: input.email,
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
      subject,
      html,
      text,
    },
    "planner-notificatie"
  );
}

/**
 * Bevestiging naar de klant voor een aanvraag via planner-link. Nooit een
 * technische foutmelding: bij een onleesbare link de normale bevestiging plus
 * een vriendelijke vraag om de PDF, of (niet_gevonden) of het ontwerp is
 * opgeslagen en gedeeld. `prijs` alleen als TOON_PRIJS_BIJ_LINK aan staat.
 */
export async function stuurLinkKlantBevestiging(klant: {
  naam: string;
  email: string;
  plannerStatus: PlannerStatus;
  prijs?: { min: number; max: number };
}): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.LEAD_NOTIFY_TO ?? site.email;
  if (!process.env.RESEND_API_KEY || !from || !klant.email) return;

  const voornaam = esc(klant.naam.split(/\s+/)[0] || klant.naam);
  const s = klant.plannerStatus;
  const pdfWa = whatsappUrl("Hoi Montagebaas, hier is de artikellijst (PDF) van mijn IKEA-keukenontwerp.");

  const inleiding =
    s === "ok"
      ? "We hebben je IKEA-ontwerp goed ontvangen en kunnen inlezen."
      : "We hebben je aanvraag en de link naar je IKEA-ontwerp goed ontvangen.";

  const verzoekHtml =
    s === "ok"
      ? ""
      : s === "niet_gevonden"
        ? `<div style="margin:0 0 16px;padding:14px 16px;background:#fbf7ee;border:1px solid #ece3cf;border-radius:12px">
             <p style="margin:0 0 6px;font-weight:600">Kun je even checken of je ontwerp is opgeslagen en gedeeld?</p>
             <p style="margin:0;font-size:14px;line-height:1.5;color:#3a3f47">We konden je ontwerp via deze link nog niet openen. Sla het ontwerp op in de IKEA Keukenplanner, kies <strong>Delen → Link kopiëren</strong> en stuur ons die nieuwe link. Of stuur de <strong>PDF met de artikellijst</strong>. Reageer gewoon op deze mail of <a href="${pdfWa}" style="color:#1a1c20;font-weight:600">stuur het via WhatsApp</a>.</p>
           </div>`
        : `<div style="margin:0 0 16px;padding:14px 16px;background:#fbf7ee;border:1px solid #ece3cf;border-radius:12px">
             <p style="margin:0 0 6px;font-weight:600">Wil je ons ook de artikellijst sturen?</p>
             <p style="margin:0;font-size:14px;line-height:1.5;color:#3a3f47">Exporteer in de IKEA Keukenplanner de <strong>PDF met de artikellijst</strong> en stuur die mee, dan maken we je prijs op de euro nauwkeurig. Reageer op deze mail of <a href="${pdfWa}" style="color:#1a1c20;font-weight:600">stuur 'm via WhatsApp</a>.</p>
           </div>`;

  const prijsHtml = klant.prijs
    ? `<div style="margin:0 0 12px;padding:14px 16px;background:#f4f1ea;border-radius:12px">
         <div style="font-size:13px;color:#6b7178">Indicatie op basis van je ontwerp</div>
         <div style="font-size:22px;font-weight:700;margin-top:2px">${euro(klant.prijs.min)} – ${euro(klant.prijs.max)}</div>
       </div>`
    : "";

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#1a1c20;max-width:560px">
      <h2 style="margin:0 0 12px">Ontwerp ontvangen, ${voornaam} ✅</h2>
      <p style="margin:0 0 16px;color:#3a3f47;line-height:1.5">${inleiding}</p>
      ${prijsHtml}
      <p style="margin:0 0 16px;color:#1a1c20;line-height:1.6">We nemen <strong>binnen 24 uur</strong> contact met je op voor je exacte vaste prijs op maat.</p>
      ${verzoekHtml}
      <p style="margin:0 0 8px;line-height:1.6">
        Liever direct contact? Bel <a href="${site.telefoonLink}" style="color:#1a1c20;font-weight:600">${site.telefoonWeergave}</a>
        of <a href="${whatsappDefault}" style="color:#1a1c20;font-weight:600">app ons via WhatsApp</a>.
      </p>
      <p style="margin:20px 0 0;color:#6b7178;font-size:13px">Met vriendelijke groet,<br/>${site.naam}</p>
    </div>`;

  const text = [
    `Ontwerp ontvangen, ${klant.naam.split(/\s+/)[0] || klant.naam}!`,
    "",
    inleiding,
    klant.prijs ? `Indicatie op basis van je ontwerp: ${euro(klant.prijs.min)} – ${euro(klant.prijs.max)}` : "",
    "We nemen binnen 24 uur contact met je op voor je exacte vaste prijs op maat.",
    s === "ok"
      ? ""
      : s === "niet_gevonden"
        ? "Kun je even checken of je ontwerp is opgeslagen en gedeeld? We konden het via deze link nog niet openen. Sla het op in de IKEA Keukenplanner, kies Delen → Link kopiëren en stuur ons die nieuwe link, of stuur de PDF met de artikellijst. Reageer op deze mail of app ons via WhatsApp."
        : "Wil je ons ook de artikellijst sturen? Exporteer in de IKEA Keukenplanner de PDF met de artikellijst en stuur die mee door op deze mail te reageren of via WhatsApp.",
    "",
    `Liever direct contact? Bel ${site.telefoonWeergave} of app ons via WhatsApp.`,
    "",
    `Met vriendelijke groet, ${site.naam}`,
  ]
    .filter((r, i, a) => r !== "" || a[i - 1] !== "")
    .join("\n");

  await verstuurViaResend(
    {
      from,
      to: [klant.email],
      reply_to: replyTo,
      subject: s === "ok" ? "Ontwerp ontvangen — je vaste prijs volgt binnen 24 uur" : "Aanvraag ontvangen — nog één vraag over je ontwerp",
      html,
      text,
    },
    "link-klant"
  );
}

/**
 * Alarm van de dagelijkse planner-monitor (api/cron/planner-monitor): het
 * vaste testontwerp is niet meer uit te lezen of de mapping klopt niet meer.
 */
export async function stuurPlannerMonitorAlarm(input: {
  uuid: string;
  problemen: string[];
  details: Record<string, unknown>;
}): Promise<void> {
  const to = process.env.PLANNER_MONITOR_TO || "ilja@montagebaas.com";
  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from) {
    console.error("[planner-monitor] Geen alarm-mail mogelijk (RESEND_API_KEY/RESEND_FROM_EMAIL ontbreekt):", input.problemen);
    return;
  }
  const text = [
    `De dagelijkse controle van de IKEA planner-link faalde voor ontwerp ${input.uuid}.`,
    "",
    "Problemen:",
    ...input.problemen.map((p) => `- ${p}`),
    "",
    "Gevolg: nieuwe aanvragen via een planner-link worden waarschijnlijk niet (goed) uitgelezen.",
    "Leads gaan niet verloren: die komen binnen met een foutstatus en de klant wordt om de PDF gevraagd.",
    "",
    "Details:",
    JSON.stringify(input.details, null, 2),
  ].join("\n");
  await verstuurViaResend(
    {
      from,
      to: [to],
      subject: `Planner-monitor faalt: ${input.problemen[0]?.slice(0, 80) ?? "onbekend"}`,
      html: `<pre style="font-family:ui-monospace,Menlo,monospace;font-size:13px;white-space:pre-wrap">${esc(text)}</pre>`,
      text,
    },
    "planner-monitor"
  );
}

/**
 * Wekelijkse herinnering (cron werkelijke-dagen): uitgevoerde klussen waarbij
 * de werkelijk gewerkte dagen nog leeg zijn. Naar de eigenaar (LEAD_NOTIFY_TO).
 */
export async function stuurWerkelijkeDagenHerinnering(klussen: KlusZonderDagen[]): Promise<boolean> {
  const to = process.env.LEAD_NOTIFY_TO;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !to || !from) {
    console.error("[werkelijke-dagen] Geen herinnering verstuurd (RESEND_API_KEY, LEAD_NOTIFY_TO of RESEND_FROM_EMAIL ontbreekt).");
    return false;
  }
  const { subject, text } = herinneringTekst(klussen, process.env.NEXT_PUBLIC_SITE_URL ?? site.url);
  await verstuurViaResend(
    {
      from,
      to: [to],
      subject,
      html: `<pre style="font-family:ui-monospace,Menlo,monospace;font-size:13px;white-space:pre-wrap">${esc(text)}</pre>`,
      text,
    },
    "werkelijke-dagen"
  );
  return true;
}
