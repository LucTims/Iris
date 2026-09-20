export interface CAPIEvent {
  event_name: string;
  event_time: number;
  action_source: "website";
  user_data: {
    em?: string; // Hashed email
    ph?: string; // Hashed phone
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: {
    currency?: string;
    value?: number;
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
  };
  event_id?: string;
}

export async function sendToCAPI(events: CAPIEvent[]) {
  const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  const ACCESS_TOKEN = process.env.FACEBOOK_CAPI_TOKEN;

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn("CAPI disabled: Missing PIXEL_ID or FACEBOOK_CAPI_TOKEN");
    return;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: events,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("CAPI Error:", result);
    } else {
      console.log("CAPI Event sent successfully:", result);
    }
  } catch (error) {
    console.error("Error sending event to Meta CAPI:", error);
  }
}
