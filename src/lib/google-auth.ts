import "server-only";
import { createSign } from "node:crypto";

/**
 * Access-token voor een Google-service-account zonder extra dependency:
 * JWT (RS256) ondertekenen met de private key en inwisselen bij oauth2.googleapis.com.
 *
 * Env: GOOGLE_SA_KEY_JSON — de volledige JSON van de service-account-sleutel,
 * als platte tekst óf base64 (handig voor Vercel). Zie docs/ADS-CONVERSIES.md.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export function leesServiceAccountKey(): ServiceAccountKey {
  const raw = process.env.GOOGLE_SA_KEY_JSON?.trim();
  if (!raw) throw new Error("GOOGLE_SA_KEY_JSON ontbreekt.");
  const tekst = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const key = JSON.parse(tekst) as Partial<ServiceAccountKey>;
  if (!key.client_email || !key.private_key) {
    throw new Error("GOOGLE_SA_KEY_JSON mist client_email of private_key.");
  }
  return { client_email: key.client_email, private_key: key.private_key, token_uri: key.token_uri };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

let cache: { token: string; verlooptOp: number } | null = null;

export async function googleAccessToken(scope: string): Promise<string> {
  const nu = Math.floor(Date.now() / 1000);
  if (cache && cache.verlooptOp - 60 > nu) return cache.token;

  const key = leesServiceAccountKey();
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope,
      aud: key.token_uri ?? TOKEN_URL,
      iat: nu,
      exp: nu + 3600,
    })
  );
  const ongetekend = `${header}.${claims}`;
  const handtekening = createSign("RSA-SHA256").update(ongetekend).sign(key.private_key);
  const assertion = `${ongetekend}.${base64url(handtekening)}`;

  const res = await fetch(key.token_uri ?? TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(
      `Google token-request mislukt (${res.status}): ${body.error ?? ""} ${body.error_description ?? ""}`.trim()
    );
  }
  cache = { token: body.access_token, verlooptOp: nu + (body.expires_in ?? 3600) };
  return body.access_token;
}
