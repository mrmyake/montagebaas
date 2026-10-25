/**
 * Eén config per merk. Montagebaas is de eerste en enige actieve; De Keukenheld
 * wordt later een tweede config plus domein op dezelfde codebase.
 */

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
  url: string;
}

export interface Merk {
  id: "montagebaas";
  naam: string;
  /** Hostnamen waarop dit merk draait (zonder poort). */
  hosts: string[];
  url: string;
  accent: string;
  accentDonker: string; // hover/links
  telefoon: { weergave: string; link: string };
  whatsapp: { nummer: string; standaardBericht: string };
  email: string;
  kvk: string;
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
