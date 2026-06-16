import { euro } from "@/lib/pricing";

/**
 * Stuurt een lead-notificatie per e-mail via MailerSend (https://www.mailersend.com).
 * Bewust via fetch i.p.v. een SDK zodat het optioneel en licht is. Als de keys ontbreken
 * of de call faalt, wordt dit gelogd maar NOOIT gegooid — de lead is al opgeslagen en mag
 * niet verloren gaan.
 *
 * ⚠️ EIGENAAR: MailerSend vereist een geverifieerd afzenderdomein. Zet MAILERSEND_FROM_EMAIL
 * op een adres binnen dat domein. (NB: de andere sites gebruiken Resend — wil je dat hier ook,
 * dan is dit bestand het enige dat hoeft te wijzigen.)
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
  const apiKey = process.env.MAILERSEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_TO;
  const fromEmail = process.env.MAILERSEND_FROM_EMAIL;
  const fromName = process.env.MAILERSEND_FROM_NAME ?? "Montagebaas";

  if (!apiKey || !to || !fromEmail) {
    console.warn(
      `[lead] Geen e-mailnotificatie verstuurd (MAILERSEND_API_KEY, LEAD_NOTIFY_TO of MAILERSEND_FROM_EMAIL ontbreekt). Lead ${lead.id} staat wel in de database.`
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
    const res = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: fromName },
        to: [{ email: to }],
        reply_to: { email: lead.email, name: lead.naam },
        subject: `Nieuwe offerteaanvraag — ${lead.naam} (${lead.postcode})`,
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error(`[lead] MailerSend gaf status ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("[lead] E-mailnotificatie mislukt:", err);
  }
}
