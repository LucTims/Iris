import { NextResponse } from "next/server";
import { generateImage, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMinimumBalance, deductFixedCoins } from "@/lib/ai/cost-engine";
import { COVER_IMAGE_COINS } from "@/lib/ai/pricing";
import {
  buildCoverPrompt,
  pollinationsUrl,
  IMAGEN_MODEL,
  COVER_WIDTH,
  COVER_HEIGHT,
  type CoverEngine,
} from "@/lib/ai/cover";

export const runtime = "nodejs";
export const maxDuration = 60;

const COVERS_BUCKET = "covers";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Récupère une image distante et renvoie ses octets + type MIME (PNG/JPEG). */
async function fetchImageBytes(url: string): Promise<{ bytes: Buffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement image échoué (${res.status})`);
  const ct = res.headers.get("content-type") || "image/jpeg";
  if (!/image\/(png|jpe?g|webp)/i.test(ct)) {
    throw new Error("Le fournisseur n'a pas renvoyé d'image valide.");
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 500) throw new Error("Image générée vide ou invalide.");
  return { bytes, contentType: ct };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`cover_${user.id}`, 10, 5 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Trop de générations de couverture. Veuillez patienter." }, { status: 429 });
    }

    const body = await req.json();
    const projectId: string | undefined = body.projectId;
    const engine: CoverEngine = body.engine === "premium" ? "premium" : "free";
    const userPrompt: string | undefined = body.prompt;

    // Le projet appartient-il à l'utilisateur ? On récupère aussi ses métadonnées
    // pour un prompt automatique de qualité.
    let meta: { title?: string; subtitle?: string; category?: string; synopsis?: string; tone?: string } = {};
    if (projectId) {
      const { data: project, error } = await supabase
        .from("projects")
        .select("id, title, subtitle, category, synopsis, tone")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();
      if (error || !project) {
        return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
      }
      meta = project;
    }

    const prompt = buildCoverPrompt({ ...meta, userPrompt });

    // Premium (Imagen) : on vérifie le solde AVANT génération.
    if (engine === "premium") {
      const ok = await checkMinimumBalance(user.id, COVER_IMAGE_COINS);
      if (!ok) {
        return NextResponse.json(
          { error: `Fonds insuffisants : ${COVER_IMAGE_COINS} pièces requises pour une couverture premium.` },
          { status: 402 }
        );
      }
    }

    // 1) Génère les octets de l'image selon le moteur.
    let bytes: Buffer;
    let contentType = "image/jpeg";
    try {
      if (engine === "premium") {
        const { image } = await generateImage({
          model: google.image(IMAGEN_MODEL),
          prompt,
          aspectRatio: "9:16",
        });
        bytes = Buffer.from(image.uint8Array);
        contentType = image.mediaType || "image/png";
      } else {
        let finalPrompt = prompt;
        try {
          const { text } = await generateText({
            model: google("gemini-2.5-flash"),
            prompt: `Translate this image generation prompt to English. Improve it to be highly descriptive, vivid, and optimized for an AI image generator like Flux or Midjourney. Keep it concise but detailed. DO NOT output anything else except the English prompt.\n\nOriginal prompt: ${prompt}`,
          });
          finalPrompt = text.trim();
        } catch (e) {
          console.error("[generate-cover] Translation failed, using original prompt.", e);
        }
        
        const hfRes = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: finalPrompt,
            parameters: {
              width: COVER_WIDTH,
              height: COVER_HEIGHT,
            }
          }),
        });

        if (!hfRes.ok) {
          const errText = await hfRes.text();
          console.error("[generate-cover] HF Error:", errText);
          throw new Error("Erreur Hugging Face API");
        }

        bytes = Buffer.from(await hfRes.arrayBuffer());
        contentType = hfRes.headers.get("content-type") || "image/jpeg";
      }
    } catch (genErr) {
      console.error("[generate-cover] échec de la génération:", genErr);
      return NextResponse.json(
        { error: "La génération de la couverture a échoué. Réessayez ou changez de moteur." },
        { status: 502 }
      );
    }

    // 2) Stocke dans Supabase Storage (bucket public "covers").
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const objectPath = `${user.id}/${projectId || "sans-projet"}-${Date.now()}.${ext}`;
    const db = admin();
    const { error: upErr } = await db.storage
      .from(COVERS_BUCKET)
      .upload(objectPath, bytes, { contentType, upsert: true });
    if (upErr) {
      console.error("[generate-cover] upload Storage échoué:", upErr);
      return NextResponse.json({ error: "Échec de l'enregistrement de la couverture." }, { status: 500 });
    }
    const { data: pub } = db.storage.from(COVERS_BUCKET).getPublicUrl(objectPath);
    const url = pub?.publicUrl;

    // 3) Premium : on débite APRÈS succès (génération + stockage).
    if (engine === "premium") {
      await deductFixedCoins(user.id, COVER_IMAGE_COINS, "Couverture premium (Imagen)", {
        project_id: projectId || null,
        engine: "imagen",
      });
    }

    // Traçabilité best-effort.
    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        project_id: projectId || null,
        action: `generate_cover_${engine}`,
        model: engine === "premium" ? IMAGEN_MODEL : "pollinations-flux",
      });
    } catch { /* non bloquant */ }

    return NextResponse.json({ url, engine, width: COVER_WIDTH, height: COVER_HEIGHT });
  } catch (error) {
    console.error("Erreur génération couverture:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la génération de la couverture." }, { status: 500 });
  }
}
