import { NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMinimumBalance, deductFixedCoins } from "@/lib/ai/cost-engine";
import { COVER_IMAGE_COINS } from "@/lib/ai/pricing";
import {
  buildCoverPrompt,
  pollinationsUrl,
  COVER_WIDTH,
  COVER_HEIGHT,
  type CoverEngine,
} from "@/lib/ai/cover";

export const runtime = "nodejs";
export const maxDuration = 300;

const COVERS_BUCKET = "covers";

/** Jeton Hugging Face — accepte plusieurs variantes d'environnement. */
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
 * Génère une image via Hugging Face Inference avec gestion intelligente du cold-start et retries.
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
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        const res = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "image/png",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: { width: COVER_WIDTH, height: COVER_HEIGHT },
            options: { wait_for_model: true, use_cache: false },
          }),
        });
        clearTimeout(timeout);

        const ct = res.headers.get("content-type") || "";

        if (res.ok && (ct.startsWith("image/") || ct.includes("octet-stream"))) {
          const bytes = Buffer.from(await res.arrayBuffer());
          if (bytes.length > 500) {
            return { bytes, contentType: ct.startsWith("image/") ? ct : "image/png" };
          }
        }

        const text = await res.text();
        lastErr = `${res.status} ${text.slice(0, 200)}`;

        // 503 ou en cours de chargement
        if (res.status === 503 || /loading|currently loading|estimated_time/i.test(text)) {
          let waitMs = 5000;
          try {
            const j = JSON.parse(text);
            if (j.estimated_time) waitMs = Math.min(20000, Math.ceil(j.estimated_time * 1000) + 1000);
          } catch { /* défaut */ }
          await sleep(waitMs);
          continue;
        }

        if (res.status === 404) break; // tenter endpoint suivant
        if (res.status === 401 || res.status === 403) {
          throw new Error(`Jeton HF invalide (${res.status})`);
        }

        await sleep(1500 * (attempt + 1));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        lastErr = msg;
        await sleep(1000 * (attempt + 1));
      }
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

/** Récupère une image distante et renvoie ses octets + type MIME. */
async function fetchImageBytes(url: string): Promise<{ bytes: Buffer; contentType: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);

  if (!res.ok) throw new Error(`Téléchargement image échoué (${res.status})`);
  const ct = res.headers.get("content-type") || "image/jpeg";
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 500) throw new Error("Image générée vide ou invalide.");
  return { bytes, contentType: ct };
}

/** Pipeline de génération multi-moteurs avec tolérance de panne complète */
async function executeImagePipeline(
  prompt: string,
  engine: CoverEngine
): Promise<{ bytes: Buffer; contentType: string; usedModel: string }> {
  // 1. Tenter DALL-E 3 si mode premium et clé configurée
  if (engine === "premium" && process.env.OPENAI_API_KEY) {
    try {
      console.log("[generate-cover] Tentative de génération DALL-E 3...");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 40000);

      const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: "1024x1792",
          response_format: "b64_json",
        }),
      });
      clearTimeout(timeout);

      if (openaiRes.ok) {
        const data = await openaiRes.json();
        if (data.data?.[0]?.b64_json) {
          const bytes = Buffer.from(data.data[0].b64_json, "base64");
          return { bytes, contentType: "image/png", usedModel: "openai/dall-e-3" };
        }
      } else {
        const errText = await openaiRes.text();
        console.warn("[generate-cover] DALL-E 3 non disponible sur ce compte, repli sur FLUX:", errText.slice(0, 200));
      }
    } catch (openAiErr) {
      console.warn("[generate-cover] Erreur appel DALL-E 3 (repli sur FLUX):", openAiErr);
    }
  }

  // 2. Tenter Hugging Face FLUX.1 (si clé disponible)
  if (hfToken()) {
    try {
      console.log("[generate-cover] Tentative Hugging Face FLUX.1...");
      const hf = await generateWithHuggingFace(prompt);
      return { bytes: hf.bytes, contentType: hf.contentType, usedModel: `huggingface/${HF_IMAGE_MODEL}` };
    } catch (hfErr) {
      console.warn("[generate-cover] HF indisponible, bascule sur Pollinations FLUX:", hfErr);
    }
  }

  // 3. Repli ultime garanti : Pollinations FLUX
  console.log("[generate-cover] Utilisation du moteur Pollinations FLUX HD...");
  const seed = Math.floor(Math.random() * 1_000_000);
  const fallback = await fetchImageBytes(pollinationsUrl(prompt, seed));
  return { bytes: fallback.bytes, contentType: fallback.contentType, usedModel: "pollinations/flux" };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`cover_${user.id}`, 15, 5 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Trop de générations de couverture. Veuillez patienter un moment." }, { status: 429 });
    }

    const body = await req.json();
    const projectId: string | undefined = body.projectId;
    const engine: CoverEngine = body.engine === "premium" ? "premium" : "free";
    const userPrompt: string | undefined = body.prompt;

    // Métadonnées du projet pour contextualiser si nécessaire
    let meta: { title?: string; subtitle?: string; category?: string; synopsis?: string; tone?: string } = {};
    if (projectId) {
      const { data: project } = await supabase
        .from("projects")
        .select("id, title, subtitle, category, synopsis, tone")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();
      if (project) meta = project;
    }

    const basePrompt = buildCoverPrompt({ ...meta, userPrompt });

    // Vérification du solde avant pour le mode premium
    if (engine === "premium") {
      const ok = await checkMinimumBalance(user.id, COVER_IMAGE_COINS);
      if (!ok) {
        return NextResponse.json(
          { error: `Fonds insuffisants : ${COVER_IMAGE_COINS} pièces requises pour une couverture premium.` },
          { status: 402 }
        );
      }
    }

    // Direction artistique IA via Gemini 2.5 Flash :
    // Traduit et enrichit le prompt en anglais professionnel ultra-détaillé pour FLUX / DALL-E
    let finalPrompt = basePrompt;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 9000);
      const { text } = await generateText({
        model: google("gemini-2.5-flash"),
        abortSignal: controller.signal,
        prompt: `You are an elite master book cover art director and prompt engineer.
Transform the following book cover idea into an award-winning, stunning, highly detailed prompt for FLUX and Midjourney.

Book Context / User Request:
"${basePrompt}"

Rules:
1. Output MUST be in ENGLISH.
2. Vertical portrait composition (ratio 2:3 or 9:16).
3. Focus on dramatic cinematic lighting, volumetric atmosphere, rich color palette, hyper-detailed textures, photorealistic or master digital painting rendering.
4. CRITICAL: Absolute prohibition of any text, letters, words, titles, typography, signs, or watermarks.
5. Return ONLY the final prompt text, no explanations, no quotes.`,
      });
      clearTimeout(t);
      if (text.trim()) finalPrompt = text.trim();
    } catch (e) {
      console.warn("[generate-cover] enrichissement prompt ignoré:", e);
    }

    // 1) Génération d'image via le pipeline résilient
    let generated: { bytes: Buffer; contentType: string; usedModel: string };
    try {
      generated = await executeImagePipeline(finalPrompt, engine);
    } catch (genErr) {
      console.error("[generate-cover] Échec total du pipeline:", genErr);
      return NextResponse.json(
        { error: "Impossible de générer l'image pour le moment. Veuillez réessayer." },
        { status: 502 }
      );
    }

    // 2) Stockage dans Supabase Storage (avec repli Data URL si Storage indisponible)
    let url: string;
    try {
      const ext = generated.contentType.includes("png") ? "png" : generated.contentType.includes("webp") ? "webp" : "jpg";
      const objectPath = `${user.id}/${projectId || "sans-projet"}-${Date.now()}.${ext}`;
      const db = admin();
      const { error: upErr } = await db.storage
        .from(COVERS_BUCKET)
        .upload(objectPath, generated.bytes, { contentType: generated.contentType, upsert: true });

      if (upErr) {
        console.warn("[generate-cover] Upload Supabase Storage échoué, repli Data URL:", upErr.message);
        url = `data:${generated.contentType};base64,${generated.bytes.toString("base64")}`;
      } else {
        const { data: pub } = db.storage.from(COVERS_BUCKET).getPublicUrl(objectPath);
        url = pub?.publicUrl || `data:${generated.contentType};base64,${generated.bytes.toString("base64")}`;
      }
    } catch (storageErr) {
      console.warn("[generate-cover] Exception Storage, repli Data URL:", storageErr);
      url = `data:${generated.contentType};base64,${generated.bytes.toString("base64")}`;
    }

    // 3) Débit des pièces uniquement en mode premium et après succès
    if (engine === "premium") {
      await deductFixedCoins(user.id, COVER_IMAGE_COINS, `Couverture premium (${generated.usedModel})`, {
        project_id: projectId || null,
        engine: generated.usedModel,
      });
    }

    // Traçabilité best-effort
    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        project_id: projectId || null,
        action: `generate_cover_${engine}`,
        model: generated.usedModel,
      });
    } catch { /* non bloquant */ }

    return NextResponse.json({ url, engine, width: COVER_WIDTH, height: COVER_HEIGHT, model: generated.usedModel });
  } catch (error) {
    console.error("Erreur serveur génération couverture:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la génération de la couverture." }, { status: 500 });
  }
}

