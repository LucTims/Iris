import { NextRequest, NextResponse } from "next/server";
import { sendToCAPI } from "@/lib/meta/capi";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { eventName, email, customData, eventId } = await req.json();

    if (!eventName) {
      return NextResponse.json({ error: "eventName is required" }, { status: 400 });
    }

    const hashedEmail = email
      ? crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex")
      : undefined;

    // Optional: Extract user agent and IP from request
    const userAgent = req.headers.get("user-agent") || undefined;
    const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;

    await sendToCAPI([{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      user_data: {
        em: hashedEmail,
        client_user_agent: userAgent,
        client_ip_address: ip,
      },
      custom_data: customData,
      event_id: eventId || `${eventName}_${Date.now()}`
    }]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in CAPI route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
