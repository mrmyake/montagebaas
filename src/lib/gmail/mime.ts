/**
 * Pure bouwstenen voor de Gmail-koppeling: de OAuth-URL en het MIME-bericht van
 * een draft. Geen netwerk, geen env; zie client.ts voor de calls.
 */

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
] as const;

export function oauthUrl(o: { clientId: string; redirectUri: string; state: string; account: string }): string {
  const qs = new URLSearchParams({
    client_id: o.clientId,
    redirect_uri: o.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    access_type: "offline",
    // Altijd opnieuw toestemming: alleen dan geeft Google een nieuwe refresh-token.
    prompt: "consent",
    login_hint: o.account,
    state: o.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${qs}`;
}

/** Ontbreekt er een van de twee scopes in wat Google teruggaf? */
export const ontbrekendeScopes = (gekregen: string) =>
  GMAIL_SCOPES.filter((s) => !gekregen.split(/\s+/).includes(s));

/** RFC 2047 voor niet-ASCII in headers (onderwerp). */
export function headerWaarde(s: string): string {
  return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`;
}

const regels76 = (b64: string) => b64.match(/.{1,76}/g)?.join("\r\n") ?? "";

export interface DraftBericht {
  van: string;
  aan: string;
  onderwerp: string;
  tekst: string;
  html: string;
  inReplyTo?: string | null;
  references?: string | null;
}

/** multipart/alternative (platte tekst + HTML), base64url voor `message.raw`. */
export function bouwMime(b: DraftBericht, grens = `kh_${Math.random().toString(36).slice(2)}`): string {
  const headers = [
    `From: ${b.van}`,
    ...(b.aan ? [`To: ${b.aan}`] : []), // zonder klantadres: draft zonder ontvanger
    `Subject: ${headerWaarde(b.onderwerp)}`,
    ...(b.inReplyTo ? [`In-Reply-To: ${b.inReplyTo}`] : []),
    ...(b.references ? [`References: ${b.references}`] : []),
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${grens}"`,
  ];
  const deel = (type: string, inhoud: string) =>
    [
      `--${grens}`,
      `Content-Type: ${type}; charset="UTF-8"`,
      "Content-Transfer-Encoding: base64",
      "",
      regels76(Buffer.from(inhoud, "utf8").toString("base64")),
    ].join("\r\n");
  const mime = [
    headers.join("\r\n"),
    "",
    deel("text/plain", b.tekst.replace(/\r?\n/g, "\r\n")),
    deel("text/html", b.html),
    `--${grens}--`,
    "",
  ].join("\r\n");
  return Buffer.from(mime, "utf8").toString("base64url");
}

/** References voor een reply: bestaande keten plus het bericht waarop we reageren. */
export function replyReferences(references: string | null, messageId: string | null): string | null {
  const delen = [references?.trim(), messageId?.trim()].filter((x): x is string => !!x);
  return delen.length ? delen.join(" ") : null;
}

export interface SendAs {
  sendAsEmail?: string;
  isPrimary?: boolean;
  verificationStatus?: string; // "accepted" | "pending"; ontbreekt bij het hoofdadres
}

/**
 * Mag de mailbox als `adres` versturen? Het adres moet in sendAs staan en (als
 * het geen hoofdadres is) geverifieerd zijn.
 */
export function heeftSendAs(lijst: SendAs[] | undefined, adres: string): boolean {
  const a = adres.trim().toLowerCase();
  return (lijst ?? []).some(
    (s) =>
      s.sendAsEmail?.trim().toLowerCase() === a &&
      (s.isPrimary || s.verificationStatus === undefined || s.verificationStatus === "accepted")
  );
}

/** Link naar de draft in Gmail, in de mailbox van `account`. */
export const draftLink = (account: string, messageId: string) =>
  `https://mail.google.com/mail/u/${encodeURIComponent(account)}/#drafts?compose=${messageId}`;
