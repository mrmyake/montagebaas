/**
 * Lichte in-memory rate-limiter (sliding window) per sleutel, bedoeld om
 * formulier-spam/bots af te remmen. Bewust dependency-vrij.
 *
 * Let op: state leeft per warme serverless-instance (Fluid Compute hergebruikt
 * instances), dus dit is best-effort — geen harde garantie over alle regio's/
 * instances. In combinatie met de honeypot vangt het het leeuwendeel van de bots.
 */

type Stamps = number[];
const buckets = new Map<string, Stamps>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

/**
 * @param key      unieke sleutel, bv. `offerte:<ip>`
 * @param max      max. toegestane verzoeken binnen het venster
 * @param windowMs venstergrootte in ms
 */
export function rateLimit(key: string, max = 5, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    const retryAfterMs = windowMs - (now - recent[0]);
    buckets.set(key, recent);
    return { allowed: false, retryAfterMs };
  }

  recent.push(now);
  buckets.set(key, recent);

  // Onbeperkte groei voorkomen: af en toe verlopen sleutels opruimen.
  if (buckets.size > 5_000) {
    for (const [k, stamps] of buckets) {
      if (stamps.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}
