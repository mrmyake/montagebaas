# Doorsturen van montagebaas.com naar dekeukenheld.nl

## Keuze: Vercel-domeinredirect, geen redirect in de app

montagebaas.com en www.montagebaas.com blijven aan het Vercel-project hangen en krijgen in
Settings → Domains de instelling "Redirect to dekeukenheld.nl" met status **301**.

Waarom:

1. **Querystring en pad blijven behouden.** Gemeten op 25-10-2026 met de redirect die nu
   andersom staat (dekeukenheld.nl → montagebaas.com), hetzelfde mechanisme:

   ```
   $ curl -sI "https://dekeukenheld.nl/kosten?gclid=test123&utm_source=google"
   HTTP/2 308
   location: https://montagebaas.com/kosten?gclid=test123&utm_source=google

   $ curl -sI "https://www.dekeukenheld.nl/keukenmonteur/utrecht?gbraid=abc&wbraid=def&utm_campaign=x%20y"
   HTTP/2 307
   location: https://montagebaas.com/keukenmonteur/utrecht?gbraid=abc&wbraid=def&utm_campaign=x%20y
   ```

   gclid, gbraid, wbraid en utm_* gaan één-op-één mee, ook gecodeerde tekens.
2. **Geen code, geen functieaanroep.** Vercel stuurt door vóór de app draait. Geen kans dat
   een bug in `proxy.ts` of een build met het verkeerde merk de redirect breekt.
3. **Los van `MERK`.** Terugdraaien is twee schakelaars: `MERK=montagebaas` en de domeinen
   terugzetten. Een redirect in de app zou bij terugdraaien zelf ook weer uit moeten.
4. **Hetzelfde patroon staat er al** voor dekeukenheld.nl en werkt.

Nadeel: een Vercel-domeinredirect is niet op een preview te testen (een preview heeft geen
eigen montagebaas.com). Daarom de meting hierboven op het bestaande mechanisme, en een
herhaling op de overstapdag (zie LIVEGANG.md stap 8).

Een redirect in de app (`proxy.ts`: host is montagebaas.com → 301 naar dekeukenheld.nl met
`request.nextUrl.search`) is het alternatief als Vercel ooit de querystring zou laten vallen.

## Let op bij het instellen

- Kies **301** (de opdracht). De huidige redirect staat op 308 (apex) en **307 (www,
  tijdelijk)**. Google behandelt 301 en 308 gelijk, maar 307 niet als verhuizing.
- Zowel `montagebaas.com` als `www.montagebaas.com` rechtstreeks naar
  `https://dekeukenheld.nl` (geen keten via www of via montagebaas.com).
- `http://` gaat eerst naar `https://` op hetzelfde domein en dan door. Twee stappen, beide
  permanent; geen probleem.

## Test op de overstapdag

```
for u in "https://montagebaas.com/?gclid=test123&utm_source=google" \
         "https://www.montagebaas.com/kosten?gclid=test123&utm_source=google" \
         "https://montagebaas.com/keukenmonteur/utrecht?gbraid=abc&wbraid=def"; do
  curl -sI "$u" | grep -iE '^(HTTP|location)'
done
```

Verwacht: `HTTP/2 301` en `location: https://dekeukenheld.nl/<zelfde pad>?<zelfde query>`.
