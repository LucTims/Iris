import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Longueurs maximales — garde-fou contre des champs démesurés en base. */
const LIMITS = {
  full_name: 120,
  bio: 2000,
  website_url: 500,
  twitter_url: 120,
  amazon_url: 500,
};

/**
 * Normalise une URL saisie par l'auteur.
 *
 * On accepte « mon-site.com » et on y ajoute https://. On REFUSE en revanche
 * tout schéma autre que http/https : une valeur `javascript:...` enregistrée
 * ici serait rendue plus tard dans un lien cliquable du profil.
 */
function normalizeUrl(value: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === null || value === undefined) return { ok: true, value: null };
  const raw = String(value).trim();
  if (!raw) return { ok: true, value: null };

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, error: "Seules les adresses http(s) sont acceptées." };
    }
    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false, error: `Adresse invalide : « ${raw} »` };
  }
}

/** Pseudo X/Twitter : on ne garde que l'identifiant, sans @ ni URL complète. */
function normalizeHandle(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return raw
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .slice(0, LIMITS.twitter_url);
}

/**
 * Mise à jour du profil auteur.
 *
 * AVANT : la page Profil lisait bio / site web / X / Amazon depuis la table
 * `profiles`, mais les ENREGISTRAIT dans les métadonnées du compte Auth
 * (`auth.updateUser({ data })`). Les colonnes correspondantes de `profiles`
 * restaient donc vides à vie, et tout ce qui lit la table directement —
 * administration, serveur MCP, futures pages publiques — ne voyait jamais ce
 * que l'auteur avait saisi. La page ne s'en apercevait pas parce que le hook
 * `useUser` recollait les deux sources à la lecture.
 *
 * La table est désormais la SOURCE DE VÉRITÉ. Les métadonnées Auth sont
 * toujours mises à jour, mais seulement pour rester compatible avec les
 * sessions déjà ouvertes.
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

    const rateLimit = await checkRateLimit(`profile_${user.id}`, 20, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Trop de modifications en peu de temps. Réessayez dans un instant." },
        { status: 429 }
      );
    }

    const body = await req.json();

    const website = normalizeUrl(body.website_url);
    if (!website.ok) return NextResponse.json({ error: website.error }, { status: 400 });

    const amazon = normalizeUrl(body.amazon_url);
    if (!amazon.ok) return NextResponse.json({ error: amazon.error }, { status: 400 });

    const fullName = String(body.full_name ?? "").trim().slice(0, LIMITS.full_name);
    if (!fullName) {
      return NextResponse.json({ error: "Le nom ne peut pas être vide." }, { status: 400 });
    }

    const updates = {
      full_name: fullName,
      bio: String(body.bio ?? "").trim().slice(0, LIMITS.bio) || null,
      website_url: website.value?.slice(0, LIMITS.website_url) || null,
      twitter_url: normalizeHandle(body.twitter_url),
      amazon_url: amazon.value?.slice(0, LIMITS.amazon_url) || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("full_name, bio, website_url, twitter_url, amazon_url, avatar_url")
      .single();

    if (error) {
      console.error("[profile] Mise à jour impossible:", error.message);
      return NextResponse.json({ error: "Enregistrement du profil impossible." }, { status: 500 });
    }

    // Compatibilité : les sessions ouvertes lisent encore les métadonnées.
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: updates.full_name,
          bio: updates.bio,
          website_url: updates.website_url,
          twitter_url: updates.twitter_url,
          amazon_url: updates.amazon_url,
        },
      });
    } catch (metaErr) {
      console.warn("[profile] Synchronisation des métadonnées Auth ignorée:", metaErr);
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("[profile] Erreur inattendue:", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
