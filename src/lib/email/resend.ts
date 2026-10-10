// Envoi transactionnel via l'API HTTP de Resend (domaine irisboom.online vérifié).
export type SendResult = { ok: true; id: string } | { ok: false; status: number; error: string };

export async function sendEmail(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, status: 0, error: "RESEND_API_KEY manquante" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Iris <no-reply@irisboom.online>",
      reply_to: process.env.EMAIL_REPLY_TO || undefined,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      headers: msg.headers,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, error: String(data?.message || res.statusText) };
  return { ok: true, id: String(data?.id || "") };
}
