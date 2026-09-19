import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { deductGenerationCost } from "@/lib/ai/cost-engine";

export const runtime = "nodejs";
export const maxDuration = 120;

const BUCKET = "project-assets";

/** Modèle de vision utilisé pour décrire les images importées. */
const VISION_MODEL = "gemini-3.6-flash";

/**
 * Décrit une image pour le flux « Vision-to-Story ».
 *
 * L'analyse est faite UNE FOIS, à l'import, et conservée dans
 * `project_assets.ai_analysis`. Tout le reste du pipeline (plan, chapitres,
 * reprises) travaille ensuite sur ce texte au lieu de re-téléverser les images
 * à chaque appel — ce qui coûtait plusieurs mégaoctets par essai, allongeait
 * la latence, et interdisait d'écrire le livre avec un modèle non multimodal.
 *
 * La description cible ce qui sert à RACONTER : personnages, action, émotion,
 * décor, moment de la journée. Pas d'interprétation esthétique.
 */
async function describeImage(
  bytes: Buffer,
  contentType: string
): Promise<{ text: string; usage: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const { text, usage } = await generateText({
      model: google(VISION_MODEL),
      abortSignal: controller.signal,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Décris cette image pour un auteur qui va écrire une histoire autour d'elle.

Donne, en 3 à 5 phrases et en français :
- qui ou quoi apparaît (personnages, animaux, objets marquants), avec leur apparence précise ;
- ce qui est en train de se passer ;
- le décor et le moment (intérieur/extérieur, saison, heure) ;
- l'émotion qui s'en dégage.

N'invente rien qui ne soit pas visible. Ne commente ni la qualité ni le style du dessin. Réponds uniquement par la description, sans préambule.`,
            },
            { type: "image", image: bytes, mediaType: contentType },
          ],
        },
      ],
    });

    return { text: (text || "").trim(), usage };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 6 Mo par image APRÈS compression côté client. Le client réduit déjà chaque
 * photo à 1600px de côté en JPEG qualité 0,82 (voir `compressImage` dans
 * l'assistant de création) : une photo de smartphone de 8 Mo arrive ici autour
 * de 300 Ko. Cette limite n'est donc qu'un garde-fou contre un client modifié.
 */
const MAX_BYTES = 6_000_000;

/** Nombre maximum d'images par envoi (l'assistant en accepte 24 au total). */
const MAX_FILES = 24;

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/** États acceptés par la contrainte CHECK de `analysis_status`. */
const ANALYSIS_STATUSES = new Set(["pending", "done", "failed", "skipped"]);

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

/**
 * Vérifie que les octets reçus sont RÉELLEMENT une image, en lisant la
 * signature du fichier. Le `Content-Type` déclaré par le client n'engage que
 * lui : sans ce contrôle, n'importe quel fichier (script, archive) pouvait
 * être déposé dans un bucket en lecture publique en annonçant `image/png`.
 */
function looksLikeImage(bytes: Buffer, contentType: string): boolean {
  if (bytes.length < 12) return false;
  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp =
    bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";

  if (contentType === "image/png") return isPng;
  if (contentType === "image/webp") return isWebp;
  return isJpeg;
}

/** Liste ordonnée des visuels d'un projet (l'ordre porte la chronologie). */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé." }, { status: 401 });
    }

    const projectId = new URL(req.url).searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId requis." }, { status: 400 });
    }

    // RLS restreint déjà les lignes au propriétaire ; le filtre explicite sur
    // user_id garde la requête correcte même si la policy évoluait.
    const { data, error } = await supabase
      .from("project_assets")
      .select("id, file_url, position, ai_analysis, analysis_status, metadata")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (error) {
      console.error("[project-assets] Lecture impossible:", error.message);
      return NextResponse.json({ error: "Lecture des images impossible." }, { status: 500 });
    }

    return NextResponse.json({ assets: data || [] });
  } catch (error) {
    console.error("[project-assets] GET erreur:", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

/**
 * Import des visuels d'un projet (dessins, photos) — socle du flux
 * « Vision-to-Story » du blueprint Storybook. Les images sont stockées dans
 * Supabase Storage et référencées dans `project_assets` ; leurs URL sont
 * ensuite jointes au prompt multimodal pour que le modèle écrive l'histoire
 * À PARTIR de ce qu'il voit.
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

    const rateLimit = await checkRateLimit(`project_assets_${user.id}`, 60, 5 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop d'images envoyées en peu de temps. Veuillez patienter un instant." },
        { status: 429 }
      );
    }

    const form = await req.formData();
    const projectId = (form.get("projectId") as string | null) || null;
    const files = form.getAll("files").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "Aucune image reçue." }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `${MAX_FILES} images maximum par envoi.` },
        { status: 400 }
      );
    }

    // Si un projet est visé, il doit appartenir à l'appelant : sans ce
    // contrôle, on pourrait rattacher des images au projet d'un autre auteur.
    if (projectId) {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!project) {
        return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
      }
    }

    // `analyze=1` déclenche la description visuelle (flux Vision-to-Story du
    // blueprint Storybook). Les autres blueprints n'en ont pas besoin et ne
    // doivent donc pas payer un appel de vision par image.
    const shouldAnalyze = form.get("analyze") === "1";

    const db = admin();
    const uploaded: Array<{
      url: string;
      path: string;
      name: string;
      position: number;
      analysis: string | null;
      analysisStatus: "done" | "failed" | "skipped";
      /** Octets conservés le temps de l'analyse, jamais renvoyés au client. */
      bytes: Buffer;
      contentType: string;
    }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `« ${file.name} » : format non supporté (PNG, JPEG ou WEBP uniquement).` },
          { status: 400 }
        );
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `« ${file.name} » dépasse 6 Mo même après compression.` },
          { status: 400 }
        );
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      if (!looksLikeImage(bytes, file.type)) {
        return NextResponse.json(
          { error: `« ${file.name} » n'est pas une image valide.` },
          { status: 400 }
        );
      }

      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const objectPath = `${user.id}/${projectId || "brouillon"}/${uniqueId}.${extensionFor(file.type)}`;

      const { error: upErr } = await db.storage
        .from(BUCKET)
        .upload(objectPath, bytes, { contentType: file.type, upsert: false });

      if (upErr) {
        console.error("[project-assets] Échec de l'upload:", upErr.message);
        return NextResponse.json({ error: "Échec de l'envoi d'une image." }, { status: 500 });
      }

      const { data: pub } = db.storage.from(BUCKET).getPublicUrl(objectPath);

      uploaded.push({
        url: pub.publicUrl,
        path: objectPath,
        name: file.name,
        position: i,
        analysis: null,
        analysisStatus: "skipped",
        bytes,
        contentType: file.type,
      });
    }

    // Description visuelle mise en cache, en PARALLÈLE par lots.
    //
    // Chaque analyse peut prendre jusqu'à 25 s. En série, une douzaine
    // d'images dépasserait largement la limite d'exécution de la fonction et
    // l'import échouerait entièrement. On borne la concurrence pour ne pas
    // saturer le quota du fournisseur d'un seul coup.
    //
    // Un échec d'analyse n'annule JAMAIS l'import : l'auteur garde son image
    // et le statut `failed` permet de relancer. Perdre une photo parce que le
    // modèle de vision a hoqueté serait absurde.
    if (shouldAnalyze) {
      const CONCURRENCY = 4;
      for (let start = 0; start < uploaded.length; start += CONCURRENCY) {
        const batch = uploaded.slice(start, start + CONCURRENCY);
        await Promise.all(
          batch.map(async (item) => {
            try {
              const described = await describeImage(item.bytes, item.contentType);
              if (described.text) {
                item.analysis = described.text;
                item.analysisStatus = "done";
                // L'analyse est un appel IA réel : elle se facture comme tel.
                await deductGenerationCost(
                  user.id,
                  VISION_MODEL,
                  described.usage,
                  `Analyse d'image : ${item.name}`,
                  { projectId, outputText: described.text }
                );
              } else {
                item.analysisStatus = "failed";
              }
            } catch (visionErr) {
              console.warn(`[project-assets] Analyse impossible pour « ${item.name} » :`, visionErr);
              item.analysisStatus = "failed";
            }
          })
        );
      }
    }

    // Référencement en base (uniquement si le projet existe déjà : dans
    // l'assistant, les images sont envoyées AVANT la création du projet, et
    // rattachées juste après via PATCH).
    if (projectId) {
      const { error: insertErr } = await db.from("project_assets").insert(
        uploaded.map((u) => ({
          project_id: projectId,
          user_id: user.id,
          file_url: u.url,
          storage_path: u.path,
          asset_type: "user-upload",
          position: u.position,
          ai_analysis: u.analysis,
          analysis_status: u.analysisStatus,
          metadata: { original_name: u.name },
        }))
      );
      if (insertErr) {
        console.error("[project-assets] Référencement en base échoué:", insertErr.message);
      }
    }

    // Les octets ne servaient qu'à l'analyse : les renvoyer au client ferait
    // transiter les images une seconde fois, dans le sens inverse.
    return NextResponse.json({
      assets: uploaded.map(({ bytes: _bytes, contentType: _contentType, ...asset }) => asset),
    });
  } catch (error) {
    console.error("[project-assets] Erreur inattendue:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi des images." }, { status: 500 });
  }
}

/**
 * Rattache a posteriori des images déjà téléversées à un projet qui vient
 * d'être créé (l'assistant envoie les visuels avant de connaître l'ID).
 */
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé." }, { status: 401 });
    }

    const { projectId, assets } = await req.json();
    if (!projectId || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!project) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    // L'analyse visuelle a déjà été faite à l'import : on la reporte telle
    // quelle plutôt que de payer une seconde fois un appel de vision.
    const rows = assets
      .slice(0, MAX_FILES)
      .filter((a: { url?: string }) => typeof a?.url === "string")
      .map(
        (
          a: { url: string; path?: string; name?: string; analysis?: string | null; analysisStatus?: string },
          i: number
        ) => ({
          project_id: projectId,
          user_id: user.id,
          file_url: a.url,
          storage_path: a.path || null,
          asset_type: "user-upload",
          position: i,
          ai_analysis: typeof a.analysis === "string" ? a.analysis : null,
          analysis_status: ANALYSIS_STATUSES.has(a.analysisStatus || "")
            ? a.analysisStatus
            : "skipped",
          metadata: { original_name: a.name || null },
        })
      );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Aucune image exploitable." }, { status: 400 });
    }

    const { error } = await admin().from("project_assets").insert(rows);
    if (error) {
      console.error("[project-assets] PATCH échoué:", error.message);
      return NextResponse.json({ error: "Rattachement des images impossible." }, { status: 500 });
    }

    return NextResponse.json({ attached: rows.length });
  } catch (error) {
    console.error("[project-assets] PATCH erreur:", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
