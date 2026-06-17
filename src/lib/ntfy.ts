/**
 * Realtime push-notificaties via ntfy.sh (https://ntfy.sh) — installeer de
 * ntfy-app op je telefoon en abonneer op het topic uit NTFY_TOPIC.
 *
 * Bewust best-effort: als NTFY_TOPIC ontbreekt of de call faalt wordt het
 * gelogd maar NOOIT gegooid. Een lead is op dat moment al opgeslagen en mag
 * niet verloren gaan door een mislukte notificatie.
 *
 * ⚠️ HTTP-headers vereisen ByteString (≤ U+00FF). Emoji of breed Unicode in de
 * Title-header breekt fetch(); gebruik daarom `asciiHeader()` voor de titel en
 * stop emoji/diacritics alleen in de body (die mag wél UTF-8 zijn).
 */

interface NtfyOpts {
  title: string;
  body: string;
  tags?: string; // komma-gescheiden, bv. "house,hammer"
  priority?: "min" | "low" | "default" | "high" | "max";
}

/** Strip diacritics en niet-ASCII zodat de waarde veilig in een HTTP-header past. */
export function asciiHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .trim();
}

export async function stuurNtfy({ title, body, tags, priority }: NtfyOpts): Promise<void> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;

  try {
    const headers: Record<string, string> = { Title: asciiHeader(title) };
    if (tags) headers.Tags = tags;
    if (priority) headers.Priority = priority;

    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers,
      body,
    });
    if (!res.ok) {
      console.error(`[ntfy] status ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("[ntfy] push mislukt:", err);
  }
}
