/**
 * Realtime push-notificaties via ntfy.sh (https://ntfy.sh) — installeer de
 * ntfy-app op je telefoon en abonneer op het topic uit NTFY_TOPIC.
 *
 * Bewust best-effort: als NTFY_TOPIC ontbreekt of de call faalt wordt het
 * gelogd maar NOOIT gegooid. Een lead is op dat moment al opgeslagen en mag
 * niet verloren gaan door een mislukte notificatie.
 *
 * ⚠️ Roep dit NOOIT met await aan in een antwoordpad — gebruik `after()`. Een
 * hangende ntfy.sh liet de bezoeker anders wachten op een push die hem niet
 * aangaat; bij het upload-pad kostte dat aantoonbaar leads (rij in de database,
 * bezoeker nooit op /bedankt). De timeout hieronder is de tweede verdedigingslijn.
 *
 * ⚠️ HTTP-headers vereisen ByteString (≤ U+00FF). Emoji of breed Unicode in de
 * Title-header breekt fetch(); gebruik daarom `asciiHeader()` voor de titel en
 * stop emoji/diacritics alleen in de body (die mag wél UTF-8 zijn).
 */

/**
 * Bovengrens voor één push. ntfy.sh antwoordt normaal ruim binnen een halve
 * seconde; 5 s geeft dus flinke marge voor een trage route of een koude
 * verbinding, zodat we geen push weggooien die het nog wél zou halen (dat zou
 * een gemiste lead-melding zijn). Tegelijk begrenst het de invocatie hard: een
 * hangende ntfy.sh houdt de serverless functie niet minutenlang open.
 */
const TIMEOUT_MS = 5000;

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
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[ntfy] GEMIST — status ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    // Elke gemiste push krijgt hetzelfde "GEMIST"-label, zodat je er in de
    // Vercel-logs op kunt filteren; de timeout onderscheiden we omdat die op
    // een storing bij ntfy.sh wijst en niet op een fout in ons bericht.
    if (err instanceof Error && err.name === "TimeoutError") {
      console.error(
        `[ntfy] GEMIST — geen antwoord binnen ${TIMEOUT_MS} ms: ${asciiHeader(title)}`
      );
    } else {
      console.error(`[ntfy] GEMIST — push mislukt (${asciiHeader(title)}):`, err);
    }
  }
}
