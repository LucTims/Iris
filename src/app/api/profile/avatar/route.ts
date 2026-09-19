import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "avatars";
const MAX_BYTES = 2_000_000; // 2 Mo, conformément au texte affiché à l'auteur.
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function extensionFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

/** Contrôle de la signature binaire : le Content-Type déclaré n'engage que le client. */
function looksLikeImage(bytes: Buffer, contentType: string): boolean {
  if (bytes.length < 12) return false;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp =
    bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";

  if (contentType === "image/png") return isPng;
  if (contentType === "image/webp") return isWebp;
  return isJpeg;
}

/**
 * Envoi de l'avatar d'auteur.
 *
 * AVANT : la page Profil affichait un bouton « Télécharger une image » et un
 * survol « Modifier » sur l'avatar, mais aucun des deux n'était relié à quoi
 * que ce soit — pas de champ fichier, pas de gestionnaire de clic, pas de
 * route. L'avatar affichait toujours les initiales, même pour un compte Google
 * dont la photo existait déjà. La fonctionnalité était purement décorative.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé." }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`avatar_${user.id}`, 10, 10 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop de changements d'avatar. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Format non supporté (JPG, PNG ou WEBP uniquement)." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image trop volumineuse (2 Mo maximum)." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!looksLikeImage(bytes, file.type)) {
      return NextResponse.json({ error: "Ce fichier n'est pas une image valide." }, { status: 400 });
    }

    const db = admin();
    // Le nom inclut un horodatage : sans cela, l'ancienne image resterait en
    // cache navigateur et l'auteur croirait que le changement a échoué.
    const objectPath = `${user.id}/avatar-${Date.now()}.${extensionFor(file.type)}`;

    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(objectPath, bytes, { contentType: file.type, upsert: true });

    if (upErr) {
      console.error("[avatar] Upload échoué:", upErr.message);
      return NextResponse.json({ error: "Échec de l'envoi de l'image." }, { status: 500 });
    }

    const { data: pub } = db.storage.from(BUCKET).getPublicUrl(objectPath);
    const avatarUrl = pub.publicUrl;

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (profileErr) {
      console.error("[avatar] Mise à jour du profil impossible:", profileErr.message);
      return NextResponse.json({ error: "Enregistrement de l'avatar impossible." }, { status: 500 });
    }

    try {
      await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
    } catch {
      /* compatibilité best-effort */
    }

    return NextResponse.json({ avatar_url: avatarUrl });
  } catch (error) {
    console.error("[avatar] Erreur inattendue:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi de l'avatar." }, { status: 500 });
  }
}
