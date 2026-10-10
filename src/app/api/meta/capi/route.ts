import { NextRequest, NextResponse } from "next/server";
import { sendToCAPI } from "@/lib/meta/capi";
import { checkRateLimit } from "@/lib/ratelimit";
import crypto from "crypto";

// Route publique (appelée à l'inscription, avant toute session) : seuls les
// événements listés ici sont relayés à Meta. Les achats (Purchase) partent
// uniquement du serveur, depuis le webhook de paiement ; un client ne peut
// donc plus envoyer de faux achats ni de valeur/devise arbitraire.
const ALLOWED_EVENTS = new Set(["CompleteRegistration"]);

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

    const rate = await checkRateLimit(`capi_${ip ?? "unknown"}`, 10, 60 * 60 * 1000);
    if (!rate.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { eventName, email, eventId } = await req.json();

    if (typeof eventName !== "string" || !ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ error: "Événement non autorisé" }, { status: 400 });
    }

    const hashedEmail =
      typeof email === "string" && email.trim()
        ? crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex")
        : undefined;

    const userAgent = req.headers.get("user-agent") || undefined;

    await sendToCAPI([{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      user_data: {
        em: hashedEmail,
        client_user_agent: userAgent,
        client_ip_address: ip,
      },
      event_id: typeof eventId === "string" && eventId ? eventId.slice(0, 100) : `${eventName}_${Date.now()}`,
    }]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in CAPI route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
