import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "manuscript-images";
const MAX_BYTES = 8_000_000; // 8 Mo — le client redimensionne déjà avant l'envoi.
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function extensionFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}

/**
 * Upload d'une image insérée par l'auteur depuis l'éditeur de manuscrit.
 *
 * Remplace l'ancien flux côté client qui encodait le fichier en base64 et
 * l'écrivait tel quel dans le HTML du chapitre : une photo de quelques Mo
 * finissait dupliquée dans `chapters.content`, ralentissant l'enregistrement
 * et l'édition IA (tout le HTML du chapitre, images comprises, part dans le
 * prompt). Ici, seule une URL courte est insérée dans le manuscrit.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`upload_image_${user.id}`, 30, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop d'images envoyées en peu de temps. Veuillez patienter quelques instants." },
        { status: 429 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Format d'image non supporté (PNG, JPEG, WEBP ou GIF uniquement)." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image trop volumineuse (8 Mo maximum)." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const objectPath = `${user.id}/${uniqueId}.${extensionFor(file.type)}`;

    const db = admin();
    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(objectPath, bytes, { contentType: file.type, upsert: false });
    if (upErr) {
      console.error("[upload-image] Échec de l'upload Supabase Storage:", upErr.message);
      return NextResponse.json({ error: "Échec de l'envoi de l'image." }, { status: 500 });
    }

    const { data: pub } = db.storage.from(BUCKET).getPublicUrl(objectPath);
    return NextResponse.json({ url: pub.publicUrl });
  } catch (error) {
    console.error("[upload-image] Erreur inattendue:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi de l'image." }, { status: 500 });
  }
}
