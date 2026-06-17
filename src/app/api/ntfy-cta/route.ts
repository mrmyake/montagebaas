import { NextResponse } from "next/server";
import { stuurNtfy } from "@/lib/ntfy";

/**
 * Realtime push als bezoekers op bel-/WhatsApp-/e-mail-knoppen klikken — ook
 * als ze het offerteformulier níet invullen. De client triggert deze route via
 * navigator.sendBeacon() (zie CtaClickTracker), wat de page-unload van een
 * tel:-link beter overleeft dan een gewone fetch().
 */

const ALLOWED_TYPES = ["phone", "whatsapp", "email"] as const;
type CtaType = (typeof ALLOWED_TYPES)[number];

const LABELS: Record<CtaType, string> = {
  phone: "📞 Bel-klik",
  whatsapp: "💬 WhatsApp-klik",
  email: "✉️ E-mail-klik",
};

const TAGS: Record<CtaType, string> = {
  phone: "phone",
  whatsapp: "speech_balloon",
  email: "email",
};

export async function POST(req: Request) {
  if (!process.env.NTFY_TOPIC) {
    return NextResponse.json({ ok: true, skipped: "no topic" });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const { type, location } = (body as { type?: string; location?: string }) ?? {};
  if (!type || !ALLOWED_TYPES.includes(type as CtaType)) {
    return NextResponse.json({ error: "bad type" }, { status: 400 });
  }

  const time = new Date().toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
  const where = location ? ` (${location})` : "";
  const message = `${LABELS[type as CtaType]} op montagebaas.com${where} - ${time}`;

  await stuurNtfy({
    title: message,
    body: message,
    tags: TAGS[type as CtaType],
    priority: "default",
  });

  return NextResponse.json({ ok: true });
}
