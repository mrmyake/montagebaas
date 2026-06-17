// Google Places API (New) — haalt live reviews op van het Google Business
// Profile. Optioneel: zonder env vars valt alles terug op de curated
// TESTIMONIALS (zie testimonials.ts). Vereiste env vars:
//   GOOGLE_PLACE_ID        — Place ID van de business (publieke info)
//   GOOGLE_PLACES_API_KEY  — API key met Places API (New)-toegang (geheim)

export type GoogleReview = {
  quote: string;
  name: string;
  rating: number;
  publishTime?: string;
};

const PLACES_API = "https://places.googleapis.com/v1/places";
const REVALIDATE_SECONDS = 86400; // 24u
const MAX_QUOTE_LENGTH = 220;

type RawReview = {
  text?: { text?: string };
  rating?: number;
  authorAttribution?: { displayName?: string };
  publishTime?: string;
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

export async function fetchGoogleReviews(): Promise<GoogleReview[]> {
  const placeId = process.env.GOOGLE_PLACE_ID;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!placeId || !apiKey) return [];

  try {
    const res = await fetch(`${PLACES_API}/${placeId}?languageCode=nl`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "reviews,rating,userRatingCount",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      console.error("Google Places API error:", res.status, await res.text());
      return [];
    }

    const data = (await res.json()) as { reviews?: RawReview[] };

    return (data.reviews ?? [])
      .filter((r) => r.text?.text && (r.rating ?? 0) >= 4)
      .map((r) => ({
        quote: truncate(r.text!.text!, MAX_QUOTE_LENGTH),
        name: r.authorAttribution?.displayName ?? "Anoniem",
        rating: r.rating ?? 5,
        publishTime: r.publishTime,
      }));
  } catch (err) {
    console.error("Google Places fetch failed:", err);
    return [];
  }
}
