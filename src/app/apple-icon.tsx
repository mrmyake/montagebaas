import { ImageResponse } from "next/og";
import { huidigMerk } from "@/lib/merk";

// App-icoon uit docs/design/LogoVinkje.dc.html: wit kastfront op een vlak in de merkkleur.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const { accent } = huidigMerk();
  const front = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 48 56"><rect x="2" y="2" width="44" height="52" rx="5" fill="#fff"/><path d="M2 30H46" stroke="${accent}" stroke-width="2.5"/><path d="M14 16l6 6 13-13" fill="none" stroke="${accent}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 42H29" stroke="${accent}" stroke-width="4" stroke-linecap="round"/></svg>`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: accent }}>
        <img src={`data:image/svg+xml;base64,${Buffer.from(front).toString("base64")}`} width={84} height={98} alt="" />
      </div>
    ),
    size
  );
}
