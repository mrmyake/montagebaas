import { euro } from "@/lib/pricing";
import { site, whatsappDefault } from "@/lib/site";

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

interface TekeningLead {
  id: string;
  naam: string;
  email: string;
  telefoon: string;
  bestandsnaam: string;
  pad: string;
}

/** Interne notificatie naar de eigenaar voor een aanvraag VIA tekening-upload. */
export async function stuurTekeningLeadNotificatie(lead: TekeningLead): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_TO;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.warn(`[lead] Geen e-mail (tekening) verstuurd; lead ${lead.id} staat wel in de database.`);
    return;
  }

  const rij = (label: string, waarde: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7178">${label}</td><td style="padding:4px 0;font-weight:600">${waarde}</td></tr>`;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#1a1c20">
      <h2 style="margin:0 0 4px">Nieuwe aanvraag — mét IKEA-tekening</h2>
      <p style="margin:0 0 16px;color:#6b7178">Lead-ID: ${lead.id}</p>
      <table style="border-collapse:collapse;font-size:14px">
        ${rij("Naam", lead.naam)}
        ${rij("Telefoon", lead.telefoon)}
        ${rij("E-mail", lead.email)}
        ${rij("Tekening", lead.bestandsnaam)}
      </table>
      <p style="margin:16px 0 0;font-size:14px;color:#6b7178">
        Bestand in Supabase Storage (bucket <strong>offerte-tekeningen</strong>):<br/>
        <code>${lead.pad}</code>
      </p>
    </div>`;
  const text = [
    `Nieuwe aanvraag MET tekening (lead ${lead.id})`,
    `Naam: ${lead.naam}`,
    `Telefoon: ${lead.telefoon}`,
    `E-mail: ${lead.email}`,
    `Tekening: ${lead.bestandsnaam}`,
    `Pad: offerte-tekeningen/${lead.pad}`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: lead.email,
        subject: `Nieuwe aanvraag mét tekening — ${lead.naam}`,
        html,
        text,
      }),
    });
    if (!res.ok) console.error(`[lead] Resend (tekening) status ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error("[lead] E-mail (tekening) mislukt:", err);
  }
}

/** Bevestiging naar de klant voor een aanvraag via tekening-upload (geen prijs). */
export async function stuurTekeningKlantBevestiging(klant: { naam: string; email: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.LEAD_NOTIFY_TO ?? site.email;
  if (!apiKey || !from || !klant.email) return;

  const voornaam = klant.naam.split(/\s+/)[0] || klant.naam;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#1a1c20;max-width:560px">
      <h2 style="margin:0 0 4px">Plan ontvangen, ${voornaam} ✅</h2>
      <p style="margin:0 0 16px;color:#3a3f47;line-height:1.5">
        Bedankt! We hebben je IKEA-tekening goed ontvangen. Je krijgt
        <strong>binnen 24 uur</strong> een exacte vaste prijs op maat.
      </p>
      <p style="margin:0 0 8px;line-height:1.6">
        Liever direct contact? Bel <a href="${site.telefoonLink}" style="color:#1a1c20;font-weight:600">${site.telefoonWeergave}</a>
        of <a href="${whatsappDefault}" style="color:#1a1c20;font-weight:600">app ons via WhatsApp</a>.
      </p>
      <p style="margin:20px 0 0;color:#6b7178;font-size:13px">Met vriendelijke groet,<br/>${site.naam}</p>
    </div>`;
  const text = [
    `Plan ontvangen, ${voornaam}!`,
    "",
    "We hebben je IKEA-tekening ontvangen. Je krijgt binnen 24 uur een exacte vaste prijs op maat.",
    "",
    `Liever direct contact? Bel ${site.telefoonWeergave} of app ons via WhatsApp.`,
    "",
    `Met vriendelijke groet, ${site.naam}`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [klant.email],
        reply_to: replyTo,
        subject: `Plan ontvangen — je vaste prijs volgt binnen 24 uur`,
        html,
        text,
      }),
    });
    if (!res.ok) console.error(`[lead] Resend (tekening-klant) status ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error("[lead] Klantbevestiging (tekening) mislukt:", err);
  }
}
