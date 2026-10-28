import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { leesSleutel, ontsleutel, versleutel } from "@/lib/versleuteling";
import { GMAIL_SCOPES, bouwMime, draftLink, heeftSendAs, ontbrekendeScopes, replyReferences, type DraftBericht, type SendAs } from "./mime";

/**
 * Gmail-koppeling voor /admin/offerte: OAuth (gmail.compose + gmail.readonly) op
 * één mailbox, refresh-token versleuteld in montagebaas.integraties. Alleen
 * drafts aanmaken en threads zoeken; nooit versturen.
 *
 * dekeukenheld.nl is een aliasdomein in de montagebaas.com-Workspace: de mailbox
 * (en dus de koppeling) is ilja@montagebaas.com, de afzender ilja@dekeukenheld.nl.
 * Die afzender moet als sendAs in de mailbox staan; anders geen koppeling en geen
 * draft (nooit met een ander From-adres).
 *
 * Env: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, INTEGRATIES_SLEUTEL, en optioneel
 * GMAIL_ACCOUNT (mailbox, standaard ilja@montagebaas.com) en GMAIL_AFZENDER
 * (From, standaard ilja@dekeukenheld.nl).
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";
const PROVIDER = "gmail";

/** De mailbox waarmee gekoppeld wordt en die in integraties staat. */
export const gmailAccount = () => (process.env.GMAIL_ACCOUNT ?? "ilja@montagebaas.com").trim().toLowerCase();
/** From-adres van elke draft: een sendAs-alias van de mailbox. */
export const gmailAfzender = () => (process.env.GMAIL_AFZENDER ?? "ilja@dekeukenheld.nl").trim().toLowerCase();

const geenSendAs = () =>
  `${gmailAfzender()} staat niet als geverifieerd verzendadres (sendAs) in de mailbox ${gmailAccount()}. ` +
  `Voeg het toe in Gmail → Instellingen → Accounts → "Mail verzenden als", of controleer de alias in de Workspace-admin. Er is geen draft gemaakt.`;

/** Koppeling ontbreekt, is verlopen of ingetrokken: Ilja moet opnieuw koppelen. */
export class GmailKoppelingFout extends Error {
  constructor(bericht: string) {
    super(bericht);
    this.name = "GmailKoppelingFout";
  }
}

export function oauthClient(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new GmailKoppelingFout("GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET ontbreken in de env.");
  return { clientId, clientSecret };
}

async function tokenCall(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  return { ok: res.ok, status: res.status, json };
}

// ---------------------------------------------------------------------------
// Koppelen
// ---------------------------------------------------------------------------

/** Code uit de callback → refresh-token opslaan. Controleert account en scopes. */
export async function koppelMetCode(code: string, redirectUri: string): Promise<void> {
  const { clientId, clientSecret } = oauthClient();
  const r = await tokenCall({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (!r.ok || !r.json.access_token) {
    throw new Error(`Google gaf geen token (${r.status}): ${r.json.error ?? ""} ${r.json.error_description ?? ""}`.trim());
  }
  if (!r.json.refresh_token) throw new Error("Google gaf geen refresh-token terug. Koppel opnieuw (toestemming wordt dan opnieuw gevraagd).");
  const missend = ontbrekendeScopes(r.json.scope ?? "");
  if (missend.length) throw new Error(`Toestemming onvolledig, ontbreekt: ${missend.join(", ")}`);

  const profiel = await gmailFetch(r.json.access_token, "/profile");
  const adres = String((profiel as { emailAddress?: unknown }).emailAddress ?? "").toLowerCase();
  if (adres !== gmailAccount()) {
    throw new Error(`Gekoppeld met ${adres || "onbekend account"}, verwacht ${gmailAccount()}. Kies bij Google het account ${gmailAccount()}.`);
  }
  const sendAs = (await gmailFetch(r.json.access_token, "/settings/sendAs")) as { sendAs?: SendAs[] };
  if (!heeftSendAs(sendAs.sendAs, gmailAfzender())) throw new Error(geenSendAs());

  const { error } = await supabaseAdmin()
    .from("integraties")
    .upsert(
      {
        provider: PROVIDER,
        account: adres,
        encrypted_refresh_token: versleutel(r.json.refresh_token, leesSleutel()),
        scopes: [...GMAIL_SCOPES],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,account" }
    );
  if (error) throw new Error(`Token opslaan mislukt: ${error.message}`);
}

export interface KoppelStatus {
  gekoppeld: boolean;
  account: string;
  bijgewerkt: string | null;
  probleem?: string;
}

/** Alleen kijken of er een rij is (geen call naar Google). */
export async function koppelStatus(): Promise<KoppelStatus> {
  const account = gmailAccount();
  try {
    const { data, error } = await supabaseAdmin()
      .from("integraties")
      .select("updated_at")
      .eq("provider", PROVIDER)
      .eq("account", account)
      .maybeSingle();
    if (error) return { gekoppeld: false, account, bijgewerkt: null, probleem: error.message };
    return { gekoppeld: !!data, account, bijgewerkt: (data?.updated_at as string | undefined) ?? null };
  } catch (e) {
    return { gekoppeld: false, account, bijgewerkt: null, probleem: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Access-token en API
// ---------------------------------------------------------------------------

let cache: { token: string; tot: number } | null = null;

async function accessToken(): Promise<string> {
  if (cache && cache.tot > Date.now() + 60_000) return cache.token;
  const { data, error } = await supabaseAdmin()
    .from("integraties")
    .select("encrypted_refresh_token")
    .eq("provider", PROVIDER)
    .eq("account", gmailAccount())
    .maybeSingle();
  if (error) throw new Error(`Koppeling lezen mislukt: ${error.message}`);
  if (!data) throw new GmailKoppelingFout("Gmail is nog niet gekoppeld.");

  const { clientId, clientSecret } = oauthClient();
  const r = await tokenCall({
    grant_type: "refresh_token",
    refresh_token: ontsleutel(data.encrypted_refresh_token as string, leesSleutel()),
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (!r.ok || !r.json.access_token) {
    if (r.json.error === "invalid_grant") throw new GmailKoppelingFout("De Gmail-koppeling is verlopen of ingetrokken.");
    throw new Error(`Token verversen mislukt (${r.status}): ${r.json.error ?? ""} ${r.json.error_description ?? ""}`.trim());
  }
  cache = { token: r.json.access_token, tot: Date.now() + 50 * 60_000 };
  return r.json.access_token;
}

async function gmailFetch(token: string, pad: string, init?: { method: string; body: unknown }): Promise<unknown> {
  const res = await fetch(`${API}${pad}`, {
    method: init?.method ?? "GET",
    headers: { authorization: `Bearer ${token}`, ...(init ? { "content-type": "application/json" } : {}) },
    body: init ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    cache = null;
    throw new GmailKoppelingFout("Gmail weigert de toegang (401): koppel opnieuw.");
  }
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } }).error?.message ?? res.statusText;
    throw new Error(`Gmail ${pad.split("?")[0]} ${res.status}: ${msg}`);
  }
  return json;
}

const api = async (pad: string, init?: { method: string; body: unknown }) => gmailFetch(await accessToken(), pad, init);

// ---------------------------------------------------------------------------
// Thread zoeken en draft maken
// ---------------------------------------------------------------------------

export interface GevondenThread {
  threadId: string;
  onderwerp: string;
  messageId: string | null; // Message-ID-header van het laatste bericht
  references: string | null;
}

type Header = { name: string; value: string };
const header = (hs: Header[] | undefined, naam: string) =>
  hs?.find((h) => h.name.toLowerCase() === naam.toLowerCase())?.value ?? null;

/** Meest recente thread met dit adres als afzender of ontvanger (drafts niet meegerekend). */
export async function zoekLaatsteThread(email: string): Promise<GevondenThread | null> {
  const adres = email.trim().replace(/[\s"()]/g, "");
  if (!adres) return null;
  const q = encodeURIComponent(`{from:${adres} to:${adres}} -in:drafts`);
  const lijst = (await api(`/messages?q=${q}&maxResults=1`)) as { messages?: { threadId: string }[] };
  const threadId = lijst.messages?.[0]?.threadId;
  if (!threadId) return null;

  const thread = (await api(
    `/threads/${threadId}?format=metadata&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=References`
  )) as { messages?: { labelIds?: string[]; payload?: { headers?: Header[] } }[] };
  const berichten = (thread.messages ?? []).filter((m) => !m.labelIds?.includes("DRAFT"));
  const laatste = berichten.at(-1);
  const eerste = berichten[0];
  return {
    threadId,
    onderwerp: header(eerste?.payload?.headers, "Subject") ?? "",
    messageId: header(laatste?.payload?.headers, "Message-ID"),
    references: header(laatste?.payload?.headers, "References"),
  };
}

export interface GemaakteDraft {
  draftId: string;
  messageId: string;
  threadId: string;
  link: string;
}

/** Verzendadres kwijt (alias weggehaald na het koppelen)? Melding op het scherm, geen draft. */
export class GmailAfzenderFout extends Error {
  constructor() {
    super(geenSendAs());
    this.name = "GmailAfzenderFout";
  }
}

export async function maakDraft(
  b: Omit<DraftBericht, "van" | "inReplyTo" | "references">,
  reply: GevondenThread | null
): Promise<GemaakteDraft> {
  const sendAs = (await api("/settings/sendAs")) as { sendAs?: SendAs[] };
  if (!heeftSendAs(sendAs.sendAs, gmailAfzender())) throw new GmailAfzenderFout();
  const raw = bouwMime({
    ...b,
    van: gmailAfzender(),
    inReplyTo: reply?.messageId ?? null,
    references: reply ? replyReferences(reply.references, reply.messageId) : null,
  });
  const res = (await api("/drafts", {
    method: "POST",
    body: { message: { raw, ...(reply ? { threadId: reply.threadId } : {}) } },
  })) as { id: string; message: { id: string; threadId: string } };
  return {
    draftId: res.id,
    messageId: res.message.id,
    threadId: res.message.threadId,
    link: draftLink(gmailAccount(), res.message.id),
  };
}
