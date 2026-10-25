/** Hoofdmenu van de oude site (v1). Los van site.ts, zodat de clientheader het kan importeren. */
export const nav = [
  { label: "Kosten", href: "/kosten" },
  { label: "Werkwijze", href: "/werkwijze" },
  { label: "Reviews", href: "/reviews" },
  { label: "Werkgebied", href: "/werkgebied" },
  { label: "Veelgestelde vragen", href: "/veelgestelde-vragen" },
  { label: "Over ons", href: "/over" },
] as const;
