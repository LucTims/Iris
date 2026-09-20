import { NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkMinimumBalance, deductFixedCoins, deductGenerationCost } from "@/lib/ai/cost-engine";
import { COVER_IMAGE_COINS } from "@/lib/ai/pricing";
import {
  buildCoverPrompt,
  pollinationsUrl,
  pollinationsToken,
  truncatePrompt,
  COVER_WIDTH,
  COVER_HEIGHT,
  GEMINI_IMAGE_MODELS,
  IMAGEN_MODEL,
  POLLINATIONS_MODELS,
  type CoverEngine,
} from "@/lib/ai/cover";

export const runtime = "nodejs";
export const maxDuration = 300;

const COVERS_BUCKET = "covers";

type GeneratedImage = { bytes: Buffer; contentType: string };

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

/** Une réponse n'est exploitable que si c'est vraiment une image non tronquée. */
function assertImagePayload(bytes: Buffer, contentType: string, provider: string): void {
  if (!contentType.startsWith("image/") && !contentType.includes("octet-stream")) {
    throw new Error(`${provider} a répondu ${contentType || "sans type"} au lieu d'une image.`);
  }
  if (bytes.length < 500) {
    throw new Error(`${provider} a renvoyé une image vide (${bytes.length} octets).`);
  }
}

/**
 * Génère une image via Hugging Face Inference avec gestion intelligente du cold-start et retries.
 */
async function generateWithHuggingFace(prompt: string): Promise<GeneratedImage> {
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
async function fetchImageBytes(url: string, provider = "Le fournisseur d'image"): Promise<GeneratedImage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 160);
    const err = new Error(`${provider} ${res.status}${detail ? `: ${detail}` : ""}`) as Error & {
      status?: number;
      retryAfter?: number;
    };
    err.status = res.status;
    const ra = Number(res.headers.get("retry-after"));
    if (Number.isFinite(ra) && ra > 0) err.retryAfter = ra * 1000;
    throw err;
  }

  // Sans ce contrôle, une page d'erreur HTML renvoyée en 200 était stockée
  // telle quelle comme « couverture » : l'auteur voyait une image cassée.
  const contentType = res.headers.get("content-type") || "";
  const bytes = Buffer.from(await res.arrayBuffer());
  assertImagePayload(bytes, contentType, provider);

  return { bytes, contentType: contentType.startsWith("image/") ? contentType : "image/jpeg" };
}

/**
 * Pollinations (moteur GRATUIT) avec repli de modèle et backoff.
 *
 * Trois correctifs par rapport à la version précédente, qui échouait de façon
 * quasi systématique en production :
 *   1. `nologo=true` est un paramètre RÉSERVÉ aux comptes authentifiés. Envoyé
 *      sans jeton, il faisait rejeter la requête. Il n'est plus ajouté que si
 *      `POLLINATIONS_TOKEN` est configuré.
 *   2. Le quota anonyme est d'UNE requête toutes les 15 secondes, par IP — et
 *      les fonctions serverless partagent leurs IP de sortie. Sans backoff, le
 *      moindre 429 tuait la génération. On réessaie maintenant en respectant
 *      `Retry-After`.
 *   3. Le prompt (enrichi par Gemini, souvent 1 000+ caractères) produisait une
 *      URL trop longue : il est tronqué côté `pollinationsUrl`.
 */
async function generateWithPollinations(prompt: string): Promise<GeneratedImage> {
  const token = pollinationsToken();
  const seed = Math.floor(Math.random() * 1_000_000);
  let lastErr = "Pollinations injoignable";

  for (const model of POLLINATIONS_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const url = pollinationsUrl(prompt, { seed, model, authenticated: Boolean(token) });
        if (!token) return await fetchImageBytes(url, `Pollinations (${model})`);

        // Avec jeton : requête authentifiée (quota plus élevé, `nologo` autorisé).
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);
        let res: Response;
        try {
          res = await fetch(url, {
            signal: controller.signal,
            headers: { Authorization: `Bearer ${token}` },
          });
        } finally {
          clearTimeout(timeout);
        }

        if (!res.ok) {
          const detail = (await res.text().catch(() => "")).slice(0, 160);
          const e = new Error(`Pollinations (${model}) ${res.status}: ${detail}`) as Error & {
            status?: number;
            retryAfter?: number;
          };
          e.status = res.status;
          const ra = Number(res.headers.get("retry-after"));
          if (Number.isFinite(ra) && ra > 0) e.retryAfter = ra * 1000;
          throw e;
        }

        const ct = res.headers.get("content-type") || "";
        const bytes = Buffer.from(await res.arrayBuffer());
        assertImagePayload(bytes, ct, `Pollinations (${model})`);
        return { bytes, contentType: ct.startsWith("image/") ? ct : "image/jpeg" };
      } catch (err) {
        const status = (err as { status?: number }).status;
        lastErr = err instanceof Error ? err.message : String(err);

        // 4xx autre que 429 = requête invalide : changer de modèle plutôt que d'insister.
        if (status && status !== 429 && status < 500) break;

        const retryAfter = (err as { retryAfter?: number }).retryAfter;
        await sleep(retryAfter ?? Math.min(16000, 4000 * (attempt + 1)));
      }
    }
  }

  throw new Error(`Pollinations indisponible: ${lastErr}`);
}

/** Clé Google — le SDK accepte deux noms de variable selon les déploiements. */
function googleKey(): string | undefined {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
}

/**
 * Gemini Image (« nano banana ») via `generateContent`.
 *
 * C'est le moteur premium qui fonctionne réellement ici : il réutilise la clé
 * Google qui sert déjà à toute la rédaction. Imagen (`:predict`, plus bas) est
 * conservé en repli mais n'est ouvert qu'aux clés Google avec facturation
 * activée — il répondait 403 sur une clé AI Studio standard, ce qui faisait
 * dégringoler le premium jusqu'au repli gratuit... lui-même cassé.
 */
async function generateWithGeminiImage(prompt: string): Promise<GeneratedImage & { usedModel: string }> {
  const key = googleKey();
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY manquante côté serveur.");

  const basePayload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };
  // Certains modèles refusent `imageConfig` : on retente alors sans configuration.
  const payloads: Array<Record<string, unknown>> = [
    {
      ...basePayload,
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "2:3" } },
    },
    { ...basePayload, generationConfig: { responseModalities: ["IMAGE"] } },
    basePayload,
  ];

  let lastErr = "";
  for (const model of GEMINI_IMAGE_MODELS) {
    for (const body of payloads) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            signal: controller.signal,
            headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );

        if (!res.ok) {
          lastErr = `${model} ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`;
          // 404 = modèle inconnu pour cette clé → inutile d'essayer les autres corps.
          if (res.status === 404) break;
          continue;
        }

        const data = await res.json();
        const blockReason = data?.promptFeedback?.blockReason;
        if (blockReason) {
          throw new Error(`Prompt refusé par Gemini (${blockReason}).`);
        }

        const parts: Array<Record<string, { data?: string; mimeType?: string; mime_type?: string }>> =
          data?.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          const inline = part.inlineData || part.inline_data;
          if (inline?.data) {
            const bytes = Buffer.from(inline.data, "base64");
            const contentType = inline.mimeType || inline.mime_type || "image/png";
            assertImagePayload(bytes, contentType, `Gemini Image (${model})`);
            return { bytes, contentType, usedModel: `google/${model}` };
          }
        }
        lastErr = `${model}: réponse sans image exploitable`;
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  throw new Error(`Gemini Image indisponible: ${lastErr}`);
}

/**
 * Google Imagen via l'API REST Generative Language (`:predict`).
 * Repli premium : nécessite une clé Google avec facturation activée.
 */
async function generateWithImagen(prompt: string): Promise<GeneratedImage> {
  const key = googleKey();
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY manquante côté serveur.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "9:16",
            personGeneration: "allow_adult",
          },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Imagen ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }

    const data = await res.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error("Réponse Imagen sans image exploitable.");

    const bytes = Buffer.from(b64, "base64");
    const contentType = data?.predictions?.[0]?.mimeType || "image/png";
    assertImagePayload(bytes, contentType, "Imagen");
    return { bytes, contentType };
  } finally {
    clearTimeout(timeout);
  }
}

/** OpenAI Images — `gpt-image-1` d'abord, repli `dall-e-3`. */
async function generateWithOpenAI(prompt: string): Promise<GeneratedImage & { usedModel: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY manquante côté serveur.");

  // `gpt-image-1` renvoie toujours du base64 (pas de response_format) ;
  // `dall-e-3` exige response_format pour éviter une URL éphémère.
  const attempts: Array<Record<string, unknown>> = [
    { model: "gpt-image-1", prompt, n: 1, size: "1024x1536", quality: "high" },
    { model: "dall-e-3", prompt, n: 1, size: "1024x1792", quality: "hd", style: "vivid", response_format: "b64_json" },
  ];

  let lastErr = "";
  for (const body of attempts) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const b64 = data?.data?.[0]?.b64_json;
        if (b64) {
          return {
            bytes: Buffer.from(b64, "base64"),
            contentType: "image/png",
            usedModel: `openai/${body.model}`,
          };
        }
        lastErr = "réponse OpenAI sans image";
      } else {
        lastErr = `${res.status} ${(await res.text()).slice(0, 200)}`;
      }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`OpenAI Images indisponible: ${lastErr}`);
}

/** Erreur portant le détail de TOUS les moteurs essayés, pour un diagnostic exploitable. */
class ImagePipelineError extends Error {
  constructor(public failures: string[]) {
    super(`Aucun moteur d'image disponible: ${failures.join(" | ") || "raison inconnue"}`);
    this.name = "ImagePipelineError";
  }
}

/**
 * Pipeline de génération multi-moteurs, tolérant à la panne.
 *
 * En mode premium on essaie, dans l'ordre : Gemini Image → Imagen → OpenAI →
 * Hugging Face FLUX. Le repli Pollinations reste tenté en dernier pour que
 * l'auteur obtienne une image malgré tout, mais il est signalé comme NON
 * premium (`premium: false`) afin de ne pas facturer 200 pièces pour une
 * image gratuite.
 */
async function executeImagePipeline(
  prompt: string,
  engine: CoverEngine
): Promise<{ bytes: Buffer; contentType: string; usedModel: string; premium: boolean; failures: string[] }> {
  const failures: string[] = [];

  const record = (label: string, err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    failures.push(`${label}: ${msg}`);
    console.warn(`[generate-cover] ${label} indisponible:`, msg);
  };

  if (engine === "premium") {
    if (googleKey()) {
      try {
        const img = await generateWithGeminiImage(prompt);
        return { ...img, premium: true, failures };
      } catch (err) {
        record("gemini-image", err);
      }

      try {
        const img = await generateWithImagen(prompt);
        return { ...img, usedModel: `google/${IMAGEN_MODEL}`, premium: true, failures };
      } catch (err) {
        record("imagen", err);
      }
    } else {
      failures.push("google: clé absente");
    }

    if (process.env.OPENAI_API_KEY) {
      try {
        const img = await generateWithOpenAI(prompt);
        return { ...img, premium: true, failures };
      } catch (err) {
        record("openai", err);
      }
    } else {
      failures.push("openai: clé absente");
    }

    if (hfToken()) {
      try {
        const hf = await generateWithHuggingFace(prompt);
        return { ...hf, usedModel: `huggingface/${HF_IMAGE_MODEL}`, premium: true, failures };
      } catch (err) {
        record("huggingface", err);
      }
    } else {
      failures.push("huggingface: clé absente");
    }
  }

  // Repli gratuit : Pollinations (Flux puis Turbo, avec backoff).
  try {
    const fallback = await generateWithPollinations(prompt);
    return { ...fallback, usedModel: "pollinations/flux", premium: false, failures };
  } catch (err) {
    record("pollinations", err);
  }

  throw new ImagePipelineError(failures);
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

    // Direction artistique IA via Gemini : traduit et enrichit le prompt en
    // anglais professionnel. La consigne de longueur est stricte : en mode
    // gratuit le prompt voyage dans une URL GET, et un pavé de 1 500 caractères
    // faisait rejeter la requête par Pollinations.
    let finalPrompt = basePrompt;
    let artDirectionUsage: unknown = undefined;
    let artDirectionText = "";
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 9000);
      const { text, usage } = await generateText({
        model: google("gemini-3.6-flash"),
        abortSignal: controller.signal,
        prompt: `You are a world-renowned visual art director and master concept artist creating multimillion-dollar bestseller book covers and cinematic movie posters.

Convert this book concept/request into a breathtaking, ultra-detailed, majestic art prompt:
"${basePrompt}"

Essential Requirements:
1. Translate to rich, vivid, evocative ENGLISH.
2. Elevate the scene: make the subject look noble, majestic, cinematic, and gorgeous. If it mentions a character or animal (e.g. a cat with gold coins), describe a regal subject with luminous glowing eyes, gleaming fur/attire, surrounded by glittering antique minted gold coins, ancient treasure chests, shimmering dust particles, and golden hour lighting.
3. Include high-end aesthetic details: "cinematic masterpiece, dramatic lighting, volumetric god rays, rich vibrant color harmony, Octane Render, 8k resolution, razor sharp focus, award-winning illustration".
4. Composition: Full-bleed vertical portrait orientation (2:3 or 9:16 aspect ratio).
5. NEVER include words like "book cover", "book lying on desk", "pages", "paper", "reading", "spine". Describe ONLY the visual scene directly.
6. Absolutely NO typography, NO letters, NO text, NO numbers, NO watermark.
7. HARD LIMIT: 80 words maximum, a single dense paragraph. Be concise and concrete, never verbose.
8. Return strictly the prompt text only, without quotes or preface.`,
      });
      clearTimeout(t);
      if (text.trim()) {
        finalPrompt = truncatePrompt(text.trim());
        artDirectionUsage = usage;
        artDirectionText = text;
      }
    } catch (e) {
      console.warn("[generate-cover] enrichissement prompt ignoré:", e);
    }

    // 1) Génération d'image via le pipeline résilient
    let generated: { bytes: Buffer; contentType: string; usedModel: string; premium: boolean; failures: string[] };
    try {
      generated = await executeImagePipeline(finalPrompt, engine);
    } catch (genErr) {
      const failures = genErr instanceof ImagePipelineError ? genErr.failures : [];
      console.error("[generate-cover] Échec total du pipeline:", failures.join(" | ") || genErr);
      return NextResponse.json(
        {
          error:
            "Impossible de générer l'image pour le moment. Les moteurs d'image sont tous indisponibles ou mal configurés.",
          // Détail technique exploitable côté support : sans lui, une clé
          // absente restait totalement invisible.
          detail: failures,
        },
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

    // 3) Débit des pièces : UNIQUEMENT si un moteur réellement premium a produit
    //    l'image. Auparavant, quand aucune clé premium n'était configurée (ou
    //    que tous les moteurs échouaient), le pipeline retombait en silence sur
    //    Pollinations — gratuit — mais facturait quand même 200 pièces. L'auteur
    //    payait le prix premium pour l'image du mode gratuit.
    const billedPremium = engine === "premium" && generated.premium;
    if (billedPremium) {
      await deductFixedCoins(user.id, COVER_IMAGE_COINS, `Couverture premium (${generated.usedModel})`, {
        project_id: projectId || null,
        engine: generated.usedModel,
      });
    } else {
      if (engine === "premium") {
        // Diagnostic explicite dans les logs : sans cela, une clé premium
        // manquante restait totalement invisible côté exploitation.
        console.error(
          "[generate-cover] Mode premium demandé mais AUCUN moteur premium disponible — " +
            "image gratuite servie, aucune pièce débitée. Causes :",
          generated.failures.join(" | ") || "inconnue"
        );
      }

      // Même une couverture « gratuite » consomme un appel IA réel : la
      // direction artistique Gemini qui traduit et enrichit le prompt. Elle
      // n'était facturée nulle part. On la débite ici au coût token réel
      // (quelques pièces) pour qu'AUCUN appel IA ne reste gratuit.
      // En premium, ce coût est déjà couvert par le forfait de 200 pièces.
      if (artDirectionText) {
        await deductGenerationCost(
          user.id,
          "gemini-3.6-flash",
          artDirectionUsage,
          "Direction artistique de couverture",
          { projectId: projectId || null, outputText: artDirectionText, inputText: basePrompt }
        );
      }
    }

    // Traçabilité best-effort
    try {
      await supabase.from("ai_usage").insert({
        user_id: user.id,
        project_id: projectId || null,
        action: `generate_cover_${billedPremium ? "premium" : "free"}`,
        model: generated.usedModel,
      });
    } catch { /* non bloquant */ }

    return NextResponse.json({
      url,
      // `engine` reflète ce qui a RÉELLEMENT été produit, pas ce qui a été demandé.
      engine: billedPremium ? "premium" : "free",
      requestedEngine: engine,
      downgraded: engine === "premium" && !billedPremium,
      charged: billedPremium ? COVER_IMAGE_COINS : 0,
      width: COVER_WIDTH,
      height: COVER_HEIGHT,
      model: generated.usedModel,
    });
  } catch (error) {
    console.error("Erreur serveur génération couverture:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la génération de la couverture." }, { status: 500 });
  }
}
