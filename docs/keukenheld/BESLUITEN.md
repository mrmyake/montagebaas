# Besluiten na Fase 0 (25-10-2026)

Antwoorden van Ilja op docs/keukenheld/FASE0.md. Deze gaan voor de prompt waar ze botsen.

1. Footer: "De Keukenheld is ingeschreven als handelsnaam onder KvK 74579320. Geen onderdeel van IKEA." Geen juridische naam, geen "voorheen Montagebaas".
2. Reviews: "4,9 uit 56 reviews op Google en Werkspot", zonder bedrijfsnaam. Quotes letterlijk.
3. Structured data: geen `alternateName`. Bij `MERK=keukenheld` staat "Montagebaas" nergens in klantteksten, metadata, structured data of mails. Geen uitzonderingen.
4. De server leest `MERK` en geeft het merk als prop door aan clientcomponenten. Geen `NEXT_PUBLIC_MERK`.
5. Resend: tweede gratis account voor dekeukenheld.nl met eigen API-key. Op de overstapdag wisselen `RESEND_API_KEY` en `RESEND_FROM_EMAIL` samen; terugdraaien = beide terugzetten.
6. Het domein komt uit het merk; `NEXT_PUBLIC_SITE_URL` is alleen een override. Weg uit Preview.
7. Google-reviewlink: veld in de merkconfig, Ilja levert de link aan.

Verder:
- Schakel 3: niets te doen.
- Montagebaas krijgt een manifest, geen OG-afbeelding.
- Terugdraaien gaat via `MERK=montagebaas`, niet via `SITE_VERSIE`.
- `@dekeukenheld.nl` in de standaard-uitsluitlijst voor Ads; Ilja zet het ook in `ADS_UITSLUITEN` op Production.
- Cookiebalk opnieuw en GA4-gebruikers die opnieuw beginnen: geaccepteerd.
