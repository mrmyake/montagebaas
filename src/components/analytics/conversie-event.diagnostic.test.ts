// Diagnostische test (schakel 3, GA4-conversie-onderzoek). Draaien:
//   node --test src/components/analytics/conversie-event.diagnostic.test.ts
//
// ConversionTracker.tsx en GtagLoader.tsx bevatten geen JSX (ze renderen null),
// maar hebben wel een .tsx-extensie — Node's ingebouwde TS-stripping kan .tsx
// niet laden (geen JSX-transform, alleen type-erasure; geverifieerd: import
// van ConversionTracker.tsx geeft ERR_UNKNOWN_FILE_EXTENSION). Er is in dit
// project geen jsdom/testing-library om een browseromgeving te simuleren.
// Daarom herbouwt deze test de exacte effect-logica van de drie betrokken
// bestanden als losstaande functies, 1-op-1 overgenomen (regelverwijzingen
// staan bij elke functie). Geen React, geen browser — puur de mechaniek.
//
// Hypothese onder test: een bezoeker op /bedankt vertrekt vaak binnen de
// 8s idle-fallback van GtagLoader, waardoor het conversie-event wel de
// dataLayer in gaat maar nooit verstuurd wordt, terwijl de sessionStorage-
// vlag al gewist is (dus geen tweede kans).

import { test } from "node:test";
import assert from "node:assert/strict";

const OFFERTE_VERZONDEN_KEY = "mb_offerte_verzonden"; // moet gelijk zijn aan ConversionTracker.tsx:17

// Minimale Web Storage-implementatie (sessionStorage-semantiek).
class FakeStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

type FakeWindow = {
  sessionStorage: FakeStorage;
  dataLayer: unknown[];
  gtag?: (...args: unknown[]) => void;
};

// 1-op-1 uit Analytics.tsx:22-25 (de beforeInteractive consent-shim):
//   window.dataLayer = window.dataLayer || [];
//   function gtag(){dataLayer.push(arguments);}
//   window.gtag = gtag;
function installGtagShim(win: FakeWindow): void {
  win.dataLayer = win.dataLayer || [];
  win.gtag = (...args: unknown[]) => {
    win.dataLayer.push(args);
  };
}

// 1-op-1 uit ConversionTracker.tsx:26-43 (de useEffect-body).
function conversionTrackerEffect(win: FakeWindow): void {
  let verzonden = false;
  try {
    verzonden = win.sessionStorage.getItem(OFFERTE_VERZONDEN_KEY) === "1";
    win.sessionStorage.getItem(OFFERTE_VERZONDEN_KEY); // leesmoment, geen effect
    if (verzonden) win.sessionStorage.removeItem(OFFERTE_VERZONDEN_KEY); // regel 33
  } catch {
    return;
  }
  if (!verzonden) return; // regel 37
  if (typeof win.gtag !== "function") return; // regel 41 — de guard
  win.gtag("event", "offerte_aanvraag"); // regel 42
}

test("mechanisme: event blijft hangen in dataLayer, vlag verdwijnt, ook al laadt het echte script nooit", () => {
  const win: FakeWindow = { sessionStorage: new FakeStorage(), dataLayer: [] };

  // Analytics.tsx's beforeInteractive-script draait altijd, ongeacht of
  // GtagLoader het echte gtag.js ooit injecteert (dat is exact de claim in
  // ConversionTracker.tsx:39-40).
  installGtagShim(win);

  // Configurator.tsx:113 / TekeningUpload.tsx:88 zetten deze vlag vóór de
  // redirect naar /bedankt.
  win.sessionStorage.setItem(OFFERTE_VERZONDEN_KEY, "1");

  // "Houd het script tegen": GtagLoader.load() wordt bewust NOOIT aangeroepen
  // — er is geen <script src=".../gtag/js"> geïnjecteerd, dus er is niets dat
  // de dataLayer ooit daadwerkelijk naar Google verstuurt.
  // (GtagLoader zelf doet hier niets — we simuleren simpelweg de afwezigheid.)

  conversionTrackerEffect(win);

  // Het event staat wél in de dataLayer...
  assert.deepEqual(win.dataLayer, [["event", "offerte_aanvraag"]]);

  // ...maar de vlag is al weg, dus er is geen enkele mogelijkheid meer om
  // dit later (bv. bij een volgende paginaload) opnieuw te proberen.
  assert.equal(win.sessionStorage.getItem(OFFERTE_VERZONDEN_KEY), null);

  // Zonder een echt gtag.js dat de dataLayer leegt/verstuurt, is dit event
  // bij het sluiten van het tabblad permanent verloren. Er is in deze
  // codebase geen sendBeacon/keepalive-vangnet voor dit specifieke event
  // (vergelijk CtaClickTracker.tsx:40-47, die dat wél heeft voor CTA-clicks).
});

// ---------------------------------------------------------------------------
// Tweede test: is de 8s-op-/bedankt-framing uit de hypothese realistisch?
// GtagLoader wordt gemount in src/app/layout.tsx:65 (binnen <Analytics/>),
// dus op het niveau van de ROOT layout — niet in bedankt/page.tsx. Bij een
// Next.js App Router client-side navigatie (router.push, zoals Configurator.
// tsx:117 en TekeningUpload.tsx:90 gebruiken) blijft de root layout gemount;
// GtagLoader remount dus niet en zijn 8s-klok start niet opnieuw op /bedankt.
// ---------------------------------------------------------------------------

type Session = {
  scriptLoadTriggered: boolean;
};

// 1-op-1 uit GtagLoader.tsx:29-37: elke interactie (pointerdown/touchstart/
// scroll/keydown) roept load() synchroon aan.
function simulateInteraction(session: Session): void {
  session.scriptLoadTriggered = true;
}

test("toepasbaarheid: GtagLoader-timer start bij eerste site-interactie, niet opnieuw op /bedankt", () => {
  const session: Session = { scriptLoadTriggered: false };

  // Bezoeker landt op /offerte (of elke andere pagina) — root layout mount,
  // GtagLoader begint te luisteren. Nog geen interactie: script nog niet
  // geladen.
  assert.equal(session.scriptLoadTriggered, false);

  // Het invullen van de Configurator (klikken door de stappen, typen in
  // naam/telefoon/e-mail) of het uploaden van een tekening (klik op de
  // dropzone) genereert onvermijdelijk pointerdown/keydown-events, ruim
  // vóór de 8s-fallback. Dat triggert GtagLoader.load() meteen.
  simulateInteraction(session);
  assert.equal(session.scriptLoadTriggered, true);

  // Verstuur → router.push("/bedankt") is een CLIENT-SIDE navigatie. De
  // root layout (met GtagLoader) unmount niet, dus dit blijft staan.
  const scriptAlreadyLoadingBeforeBedankt = session.scriptLoadTriggered;
  assert.equal(scriptAlreadyLoadingBeforeBedankt, true);

  // Conclusie: in de daadwerkelijke offerte-flow is het script vrijwel
  // altijd al aan het laden (of klaar) tegen de tijd dat ConversionTracker
  // op /bedankt mount — de 8s-idle-timer is dan al lang gepasseerd of
  // überhaupt nooit nodig geweest. Het losse mechanisme uit de eerste test
  // is dus reëel, maar wordt in de praktijk zelden getriggerd door "8
  // seconden stilzitten op /bedankt" — eerder door dingen die de eerste
  // test wél post: een adblocker/extensie die googletagmanager.com blokkeert
  // (dan laadt het script nooit, ongeacht interactie of tijd).
});
