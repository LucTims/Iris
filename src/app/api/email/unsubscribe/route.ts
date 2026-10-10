import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

// Désinscription des e-mails d'accompagnement, sans connexion (lien signé).
// GET : clic depuis le mail. POST : désinscription « en un clic » de Gmail/Yahoo
// (en-tête List-Unsubscribe-Post).

async function optOut(req: Request): Promise<boolean> {
  const url = new URL(req.url);
  const userId = url.searchParams.get("u") || "";
  const token = url.searchParams.get("t") || "";
  if (!userId || !verifyUnsubscribeToken(userId, token)) return false;

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await db.from("profiles").update({ email_opt_out: true }).eq("id", userId);
  return !error;
}

const page = (title: string, message: string) =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;padding:0 16px;color:#1a1a1a;text-align:center">
<h1 style="color:#C8472B;font-size:22px">${title}</h1><p>${message}</p>
<p><a href="https://www.irisboom.online" style="color:#C8472B">Retour sur Iris</a></p></body></html>`;

export async function GET(req: Request) {
  const ok = await optOut(req);
  return new NextResponse(
    ok
      ? page("Désinscription confirmée", "Vous ne recevrez plus nos e-mails de conseils. Les e-mails liés à votre compte (confirmation, mot de passe) restent envoyés.")
      : page("Lien invalide", "Ce lien de désinscription n'est pas valide."),
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function POST(req: Request) {
  const ok = await optOut(req);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
