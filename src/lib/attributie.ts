/**
 * Attributie: waar kwam deze bezoeker vandaan?
 *
 * Bewust ZONDER enige Google-afhankelijkheid. De klik-identifier staat in de URL
 * — niet in een cookie van Google — en we bewaren hem in een eigen first-party
 * cookie via document.cookie. Adblockers en privacybrowsers blokkeren het script van
 * googletagmanager.com, niet je eigen cookie. Juist de bezoekers die in GA4
 * volledig onzichtbaar zijn (geen enkele paginaweergave) blijven zo
 * attribueerbaar; dat was 7 van de 8 ontbrekende conversies in de meting over
 * 28 juni t/m 10 augustus.
 *
 * Dit bestand bevat alleen pure functies + types, zodat het zowel client-side
 * (AttributieCapture) als server-side (de twee insert-paden) gebruikt kan
 * worden en volledig testbaar is zonder browser. `next/headers` hoort hier
 * dus NIET thuis — de aanroeper geeft een cookie-lezer mee.
 */

export const ATTRIBUTIE_COOKIE = "mb_attributie";

/** Gelijk aan het standaard Google Ads-lookbackvenster voor conversies. */
export const BEWAARTERMIJN_DAGEN = 90;

/** Bovengrens per veld — houdt de cookie klein en onbruikbaar als opslagplek. */
const MAX_LENGTE = 200;

export interface Attributie {
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_page: string | null;
  referrer: string | null;
}

const LEEG: Attributie = {
  gclid: null,
  gbraid: null,
  wbraid: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_term: null,
  utm_content: null,
  landing_page: null,
  referrer: null,
};

/**
 * De drie klik-identifiers van Google Ads. Google stuurt er per klik altijd
 * precies één mee: `gclid` normaal, `gbraid`/`wbraid` bij iOS-verkeer waar
 * app-naar-web niet met een gclid te volgen is. Ze zijn dus alternatieven van
 * elkaar, geen aanvullingen — zie de invariant bij `leesUitUrl`.
 */
const KLIK_VELDEN = ["gclid", "gbraid", "wbraid"] as const;

const UTM_VELDEN = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

function schoon(waarde: string | null | undefined): string | null {
  if (!waarde) return null;
  const s = waarde.trim().slice(0, MAX_LENGTE);
  return s || null;
}

/**
 * Leest de attributie uit een URL + referrer.
 *
 * Geeft `null` als er GEEN enkele attributieparameter in de URL staat. Dat is
 * het belangrijkste onderscheid van deze module: een direct bezoek, een
 * organische terugkeer of een interne navigatie levert niets op, en mag dus
 * ook niets overschrijven.
 *
 * INVARIANT — één klik-identifier per opgeslagen record. Deze functie bouwt het
 * record altijd op vanaf `LEEG`, dus elk veld dat niet in de huidige URL staat
 * wordt `null`. In combinatie met `volgendeCookieWaarde`, dat de cookie in zijn
 * geheel vervangt in plaats van veld voor veld te mengen, kan een record dus
 * nooit een gclid uit bezoek 1 én een gbraid uit bezoek 2 bevatten: het laatste
 * geparameteriseerde bezoek wint volledig. Dat is precies wat je wilt bij een
 * offline conversion import, waar per conversie één identifier hoort.
 */
export function leesUitUrl(href: string, referrer?: string | null): Attributie | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  const p = url.searchParams;
  const velden: Partial<Attributie> = {};
  for (const veld of KLIK_VELDEN) velden[veld] = schoon(p.get(veld));
  for (const veld of UTM_VELDEN) velden[veld] = schoon(p.get(veld));

  const heeftAttributie = [...KLIK_VELDEN, ...UTM_VELDEN].some((v) => velden[v]);
  if (!heeftAttributie) return null;

  return {
    ...LEEG,
    ...velden,
    landing_page: schoon(url.pathname + url.search),
    referrer: schoon(referrer),
  };
}

/**
 * Bepaalt de nieuwe cookiewaarde bij een paginaweergave, of `null` als de
 * cookie ongemoeid moet blijven.
 *
 * De regel: een URL zónder attributieparameters laat de bestaande waarde staan.
 * Zonder dat zou elk direct bezoek of elke organische terugkeer de herkomst van
 * een eerdere advertentieklik wissen, en dat is precies wat we willen bewaren.
 * Een URL mét parameters wint wél — inclusief een nieuwe klik-identifier over
 * een oude, ook als dat een andere soort is (gbraid over gclid).
 *
 * Dat is last-non-direct-touch: hetzelfde model dat GA4 zelf hanteert, zodat
 * onze cijfers en GA4 dezelfde kant op wijzen bij het reconciliëren.
 */
export function volgendeCookieWaarde(href: string, referrer?: string | null): string | null {
  const nieuw = leesUitUrl(href, referrer);
  return nieuw ? serialiseer(nieuw) : null;
}

export function serialiseer(a: Attributie): string {
  // Alleen gevulde velden opslaan — scheelt fors in cookiegrootte.
  const compact: Record<string, string> = {};
  for (const [k, v] of Object.entries(a)) if (v) compact[k] = v;
  return JSON.stringify(compact);
}

export function deserialiseer(raw: string | null | undefined): Attributie | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const bron = parsed as Record<string, unknown>;
    const uit: Attributie = { ...LEEG };
    for (const sleutel of Object.keys(LEEG) as (keyof Attributie)[]) {
      const v = bron[sleutel];
      uit[sleutel] = typeof v === "string" ? schoon(v) : null;
    }
    return uit;
  } catch {
    return null; // beschadigde of geknoeide cookie → alsof er niets stond
  }
}

/**
 * Haalt de GA4 client_id uit de `_ga`-cookie.
 *
 * Vorm: `GA1.1.1234567890.1234567890`; de client_id zijn de laatste twee delen.
 * Bestaat de cookie niet — precies het geval bij bezoekers die gtag.js
 * blokkeren, én bij geweigerde toestemming — dan geeft dit `null` terug. Er
 * wordt bewust NIETS verzonnen: een verzonnen id maakt van elke conversie een
 * fantoomgebruiker zonder sessiecontext en vervuilt de GA4-cijfers.
 */
export function parseGaClientId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const delen = raw.split(".");
  if (delen.length < 4) return null;
  const clientId = delen.slice(-2).join(".");
  return /^\d+\.\d+$/.test(clientId) ? clientId : null;
}

/** Minimale vorm van een cookie-store; past op zowel Next's cookies() als een test-dubbel. */
export interface CookieLezer {
  get(name: string): { value: string } | undefined;
}

/**
 * Alle attributievelden in de vorm waarin ze de aanvragen-tabel in gaan.
 * Eén aanroep per insert-pad; ontbrekende waarden worden expliciet null.
 */
export function attributieVoorInsert(store: CookieLezer): Attributie & {
  ga_client_id: string | null;
} {
  let rauw: string | undefined;
  try {
    rauw = store.get(ATTRIBUTIE_COOKIE)?.value;
  } catch {
    rauw = undefined;
  }
  // De client schrijft de waarde URL-encoded weg (JSON bevat tekens die niet
  // rechtstreeks in een cookie mogen).
  let json: string | null = null;
  if (rauw) {
    try {
      json = decodeURIComponent(rauw);
    } catch {
      json = rauw; // niet-encoded of stukke waarde → alsnog proberen
    }
  }

  const a = deserialiseer(json) ?? LEEG;
  let ga: string | null = null;
  try {
    ga = parseGaClientId(store.get("_ga")?.value);
  } catch {
    ga = null;
  }

  return { ...a, ga_client_id: ga };
}
