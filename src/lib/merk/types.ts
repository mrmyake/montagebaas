/**
 * Eén config per merk. Het actieve merk komt uit env MERK (zie index.ts); er draait
 * er altijd maar één tegelijk.
 */

export type MerkId = "montagebaas" | "keukenheld";

export interface ReviewQuote {
  naam: string;
  plaats?: string;
  klus?: string; // zoals in docs/design/montagebaas-reviews.md
  bron: "google" | "werkspot";
  /** Letterlijk uit montagebaas-reviews.md, of ingekort mét "…". */
  tekst: string;
}

export interface ReviewScore {
  score: string; // "5,0" — als tekst, met komma
  aantal: number;
  /** Profiel- of reviewlink. null = nog niet bekend; de score staat dan zonder link. */
  url: string | null;
}

export interface Icoon {
  url: string;
  sizes?: string;
  type?: string;
}

export interface Merk {
  id: MerkId;
  naam: string;
  /** Hoofddomein, zonder www. */
  domein: string;
  url: string;
  accent: string;
  accentDonker: string; // hover/links
  telefoon: { weergave: string; link: string };
  /** groet: begin van vooringevulde WhatsApp-berichten ("Hoi Montagebaas"). */
  whatsapp: { nummer: string; groet: string; standaardBericht: string };
  email: string;
  /**
   * Reply-to van klantmails. Zonder waarde: LEAD_NOTIFY_TO, zoals bij Montagebaas.
   * LEAD_NOTIFY_TO blijft de ontvanger van de meldingen aan Ilja.
   */
  replyTo?: string;
  /** Onderwerp van de bevestigingsmail aan de klant (formulierroute). */
  onderwerpBevestiging: string;
  /** Afzender als RESEND_FROM_EMAIL ontbreekt. Het domein moet in Resend geverifieerd zijn. */
  afzender: string;
  kvk: string;
  /**
   * Regel over KvK en IKEA in de footer. Zonder waarde: de footer zoals bij
   * Montagebaas ("… is geen onderdeel van IKEA." en "· KvK …" achter het adres).
   */
  footerJuridisch?: string;
  /**
   * Beeldmerk als afbeelding in de header (naast de naam). Zonder waarde: het
   * getekende kastfront uit components/merk/Beeldmerk.
   */
  logo?: { src: string; breedte: number; hoogte: number };
  /** Logo voor structured data (LocalBusiness.logo). */
  logoStructured?: string;
  iconen: {
    /** Bestand achter /favicon.ico (rewrite in next.config.ts). */
    favicon: string;
    icon: Icoon[];
    apple: Icoon;
    /** Voor het webmanifest. */
    manifest: Icoon[];
  };
  /** OG/Twitter-afbeelding, 1200×630. Zonder waarde: geen afbeelding. */
  ogImage?: string;
  adres: { straat: string; postcode: string; plaats: string };
  werkgebied: {
    /** Volledige zin voor werkgebied-sectie en FAQ. */
    tekst: string;
    /** Kort, voor de vertrouwensbalk. */
    kort: string;
    centrum: string;
    straalKm: number;
    /** Plaatsen op de homepage (alleen binnen de straal). slug = bestaande stadspagina. */
    steden: { naam: string; slug: string }[];
    parkeren: string;
  };
  reviews: {
    totaal: { score: string; aantal: number };
    google: ReviewScore;
    werkspot: ReviewScore;
    homepage: ReviewQuote[];
  };
}
