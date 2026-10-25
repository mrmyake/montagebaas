import Image from "next/image";

/**
 * Beeldmerk: kastfront met een vinkje als greep (docs/design/LogoVinkje.dc.html).
 * `kleur` is het front, `lijn` de deur-naad, het vinkje en de greep.
 */
export function Beeldmerk({
  kleur = "var(--merk-accent, #0F7B6C)",
  lijn = "#FFFFFF",
  className,
  titel,
}: {
  kleur?: string;
  lijn?: string;
  className?: string;
  titel?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 56"
      className={className}
      role={titel ? "img" : undefined}
      aria-label={titel}
      aria-hidden={titel ? undefined : true}
    >
      <rect x="2" y="2" width="44" height="52" rx="5" fill={kleur} />
      <path d="M2 30H46" stroke={lijn} strokeWidth="2.5" />
      <path d="M14 16l6 6 13-13" fill="none" stroke={lijn} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 42H29" stroke={lijn} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Beeldmerk + woordmerk in Schibsted Grotesk 800. Met `logo` (merkconfig) staat
 * dat bestand op de plek van het getekende kastfront, ongeveer 42 px hoog.
 */
export function Woordmerk({
  naam,
  klein = false,
  logo,
}: {
  naam: string;
  klein?: boolean;
  logo?: { src: string; breedte: number; hoogte: number };
}) {
  return (
    <span className="flex items-center gap-2 sm:gap-2.5">
      {logo ? (
        <Image
          src={logo.src}
          width={logo.breedte}
          height={logo.hoogte}
          alt=""
          priority
          sizes="48px"
          className={klein ? "h-[34px] w-auto" : "h-[36px] w-auto sm:h-[42px]"}
        />
      ) : (
        <Beeldmerk className={klein ? "h-[26px] w-[22px]" : "h-[26px] w-[22px] sm:h-[33px] sm:w-[28px]"} />
      )}
      <span className={`font-extrabold tracking-[-0.02em] ${klein ? "text-[17px]" : "text-[17px] sm:text-[20px]"}`}>{naam}</span>
    </span>
  );
}
