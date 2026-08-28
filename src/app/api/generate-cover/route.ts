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
// Les modèles d'image gratuits (Hugging Face) peuvent « démarrer à froid »
// (chargement du modèle) : on laisse une marge généreuse pour ne pas couper
// une génération légitime. Nécessite un plan Vercel autorisant maxDuration>60.
export const maxDuration = 300;

const COVERS_BUCKET = "covers";

/** Jeton Hugging Face — accepte plusieurs noms de variable d'environnement. */
function hfToken(): string | undefined {
  return (
    process.env.HUGGINGFACE_API_KEY ||
    process.env.HF_TOKEN ||
    process.env.HUGGING_FACE_TOKEN ||
    process.env.HUGGINGFACE_TOKEN
  );
}

/** Modèle d'image HF (surchargeable via env). FLUX.1-schnell = rapide (4 étapes). */
const HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Génère une image via Hugging Face Inference. Gère les deux cas qui faisaient
 * échouer la version précédente :
 *   - le nouvel endpoint « router » (l'ancien api-inference renvoie souvent 404) ;
 *   - le démarrage à froid : HF répond 503 + JSON {estimated_time} tant que le
 *     modèle charge — on réessaie au lieu d'abandonner.
 * Lève une erreur explicite si le jeton manque ou après plusieurs échecs.
 */
async function generateWithHuggingFace(prompt: string): Promise<{ bytes: Buffer; contentType: string }> {
  const token = hfToken();
  if (!token) {
    throw new Error("HUGGINGFACE_API_KEY manquant côté serveur.");
  }

  const endpoints = [
    `https://router.huggingface.co/hf-inference/models/${HF_IMAGE_MODEL}`,
    `https://api-inference.huggingface.co/models/${HF_IMAGE_MODEL}`,
  ];

  let lastErr = "";
  for (const url of endpoints) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { width: COVER_WIDTH, height: COVER_HEIGHT },
          // Ne fait pas patienter côté HF : on gère nous-mêmes le retry.
          options: { wait_for_model: true, use_cache: false },
        }),
      });

      const ct = res.headers.get("content-type") || "";

      if (res.ok && ct.startsWith("image/")) {
        const bytes = Buffer.from(await res.arrayBuffer());
        if (bytes.length < 500) throw new Error("Image HF vide.");
        return { bytes, contentType: ct };
      }

      // Réponse JSON = erreur ou « modèle en cours de chargement ».
      const text = await res.text();
      lastErr = `${res.status} ${text.slice(0, 200)}`;

      // 503 / "loading" → on attend l'estimation puis on réessaie.
      if (res.status === 503 || /loading|currently loading|estimated_time/i.test(text)) {
        let waitMs = 8000;
        try {
          const j = JSON.parse(text);
          if (j.estimated_time) waitMs = Math.min(30000, Math.ceil(j.estimated_time * 1000) + 1500);
        } catch { /* garde le défaut */ }
        await sleep(waitMs);
        continue;
      }

      // 404 sur cet endpoint → on tente l'endpoint suivant.
      if (res.status === 404) break;

      // 401/403 → jeton invalide : inutile d'insister.
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Hugging Face a refusé le jeton (${res.status}).`);
      }

      // Autre erreur : petit backoff puis retry.
      await sleep(2000 * (attempt + 1));
    }
  }
  throw new Error(`Hugging Face indisponible: ${lastErr}`);
}

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
        const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt,
            n: 1,
            size: "1024x1792",
            response_format: "b64_json"
          }),
        });

        if (!openaiRes.ok) {
          const errText = await openaiRes.text();
          console.error("[generate-cover] OpenAI Error:", errText);
          throw new Error("Erreur OpenAI DALL-E 3");
        }

        const data = await openaiRes.json();
        bytes = Buffer.from(data.data[0].b64_json, "base64");
        contentType = "image/png";
      } else {
        // Traduction/enrichissement du prompt en anglais (Flux rend mieux en
        // anglais). Bornée dans le temps : ce bonus ne doit jamais bloquer ni
        // rallonger indéfiniment la génération.
        let finalPrompt = prompt;
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 8000);
          const { text } = await generateText({
            model: google("gemini-2.5-flash"),
            abortSignal: controller.signal,
            prompt: `Translate and enrich this book-cover image prompt into vivid, concise ENGLISH optimised for a Flux image model. Output ONLY the English prompt.\n\n${prompt}`,
          });
          clearTimeout(t);
          if (text.trim()) finalPrompt = text.trim();
        } catch (e) {
          console.warn("[generate-cover] traduction ignorée (non bloquant):", e);
        }

        // Moteur gratuit : Hugging Face en priorité, repli automatique sur
        // Pollinations si HF échoue (jeton, 404, surcharge…), pour que le mode
        // gratuit produise quasiment toujours une image.
        try {
          const hf = await generateWithHuggingFace(finalPrompt);
          bytes = hf.bytes;
          contentType = hf.contentType;
        } catch (hfErr) {
          console.warn("[generate-cover] HF indisponible, repli Pollinations:", hfErr);
          const fallback = await fetchImageBytes(pollinationsUrl(finalPrompt, Math.floor(Math.random() * 1e6)));
          bytes = fallback.bytes;
          contentType = fallback.contentType;
        }
      }
    } catch (genErr) {
      console.error("[generate-cover] échec de la génération:", genErr);
      return NextResponse.json(
        { error: "La génération de la couverture a échoué. Réessayez dans un instant ou changez de moteur." },
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
      await deductFixedCoins(user.id, COVER_IMAGE_COINS, "Couverture premium (DALL-E 3)", {
        project_id: projectId || null,
        engine: "dall-e-3",
      });
    }

    // Traçabilité best-effort.
    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        project_id: projectId || null,
        action: `generate_cover_${engine}`,
        model: engine === "premium" ? "dall-e-3" : HF_IMAGE_MODEL,
      });
    } catch { /* non bloquant */ }

    return NextResponse.json({ url, engine, width: COVER_WIDTH, height: COVER_HEIGHT });
  } catch (error) {
    console.error("Erreur génération couverture:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la génération de la couverture." }, { status: 500 });
  }
}
