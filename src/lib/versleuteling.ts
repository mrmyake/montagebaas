/**
 * Versleuteling van geheimen in de database (montagebaas.integraties):
 * AES-256-GCM met een sleutel uit de env (INTEGRATIES_SLEUTEL, 32 bytes base64).
 * Formaat: "v1:<iv>:<tag>:<ciphertext>", alles base64url. PUUR op de sleutel na.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function leesSleutel(raw: string | undefined = process.env.INTEGRATIES_SLEUTEL): Buffer {
  const sleutel = Buffer.from((raw ?? "").trim(), "base64");
  if (sleutel.length !== 32) {
    throw new Error("INTEGRATIES_SLEUTEL ontbreekt of is geen 32 bytes (base64). Maak er een met: openssl rand -base64 32");
  }
  return sleutel;
}

export function versleutel(tekst: string, sleutel: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sleutel, iv);
  const data = Buffer.concat([cipher.update(tekst, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data].map((x) => (typeof x === "string" ? x : x.toString("base64url"))).join(":");
}

export function ontsleutel(versleuteld: string, sleutel: Buffer): string {
  const [versie, iv, tag, data] = versleuteld.split(":");
  if (versie !== "v1" || !iv || !tag || !data) throw new Error("Onbekend versleutelformaat");
  const decipher = createDecipheriv("aes-256-gcm", sleutel, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
