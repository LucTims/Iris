import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "project-assets";

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
      .select("id, file_url, position, metadata")
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

    const db = admin();
    const uploaded: Array<{ url: string; path: string; name: string; position: number }> = [];

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
      uploaded.push({ url: pub.publicUrl, path: objectPath, name: file.name, position: i });
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
          metadata: { original_name: u.name },
        }))
      );
      if (insertErr) {
        console.error("[project-assets] Référencement en base échoué:", insertErr.message);
      }
    }

    return NextResponse.json({ assets: uploaded });
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

    const rows = assets
      .slice(0, MAX_FILES)
      .filter((a: { url?: string; path?: string }) => typeof a?.url === "string")
      .map((a: { url: string; path?: string; name?: string }, i: number) => ({
        project_id: projectId,
        user_id: user.id,
        file_url: a.url,
        storage_path: a.path || null,
        asset_type: "user-upload",
        position: i,
        metadata: { original_name: a.name || null },
      }));

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
