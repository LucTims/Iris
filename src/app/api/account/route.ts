import { NextResponse } from "next/server";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";

/**
 * Droits RGPD promis par /privacy :
 *  - GET    : export JSON de toutes les données du compte (droit d'accès / portabilité) ;
 *  - DELETE : suppression définitive du compte (droit à l'effacement).
 *
 * En base, toutes les tables utilisateur sont en ON DELETE CASCADE depuis
 * auth.users : supprimer l'utilisateur Auth efface profil, projets, chapitres,
 * portefeuille, transactions, jobs, clés API... Seuls les fichiers du Storage
 * doivent être nettoyés à part (rangés sous `<user_id>/` dans chaque bucket).
 */

const STORAGE_PREFIXES: Array<{ bucket: string; prefix: (userId: string) => string }> = [
  { bucket: "avatars", prefix: (id) => id },
  { bucket: "covers", prefix: (id) => id },
  { bucket: "covers", prefix: (id) => `exports/${id}` },
  { bucket: "manuscript-images", prefix: (id) => id },
  { bucket: "project-assets", prefix: (id) => id },
];

function getAdminClient(): SupabaseClient {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Liste récursivement les fichiers sous un préfixe (les sous-dossiers ont id === null).
async function listFilesRecursive(admin: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const files: string[] = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: PAGE, offset });
    if (error || !data || data.length === 0) break;
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id === null) files.push(...(await listFilesRecursive(admin, bucket, path)));
      else files.push(path);
    }
    if (data.length < PAGE) break;
  }
  return files;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const rate = await checkRateLimit(`account_export_${user.id}`, 5, 60 * 60 * 1000);
  if (!rate.success) {
    return NextResponse.json({ error: "Trop d'exports. Réessayez dans une heure." }, { status: 429 });
  }

  // Client de session : la RLS garantit qu'on ne lit que les lignes de l'utilisateur.
  const [profile, projects, wallet, transactions, licenses, usage, assets] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("projects").select("*, chapters(*)").eq("user_id", user.id),
    supabase.from("wallets").select("balance, created_at, coin_transactions(type, amount, description, created_at)").eq("user_id", user.id).maybeSingle(),
    supabase.from("transactions").select("*").eq("user_id", user.id),
    supabase.from("redeemed_licenses").select("*").eq("user_id", user.id),
    supabase.from("ai_usage").select("*").eq("user_id", user.id),
    supabase.from("project_assets").select("file_url, storage_path, asset_type, ai_analysis, created_at, project_id").eq("user_id", user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at, providers: user.app_metadata?.providers ?? [] },
    profile: profile.data,
    projects: projects.data ?? [],
    wallet: wallet.data,
    payments: transactions.data ?? [],
    redeemed_licenses: licenses.data ?? [],
    ai_usage: usage.data ?? [],
    uploaded_images: assets.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="iris-mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "SUPPRIMER") {
    return NextResponse.json({ error: "Confirmation manquante : tapez SUPPRIMER." }, { status: 400 });
  }

  const rate = await checkRateLimit(`account_delete_${user.id}`, 3, 60 * 60 * 1000);
  if (!rate.success) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
  }

  const admin = getAdminClient();

  // Un compte admin ne se supprime pas depuis l'interface (évite de perdre
  // l'accès à l'administration par erreur).
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role === "admin") {
    return NextResponse.json({ error: "Un compte administrateur ne peut pas être supprimé ici." }, { status: 403 });
  }

  // 1. Fichiers du Storage (non couverts par les cascades SQL).
  for (const { bucket, prefix } of STORAGE_PREFIXES) {
    const paths = await listFilesRecursive(admin, bucket, prefix(user.id));
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) console.error(`[account] Suppression Storage ${bucket} échouée:`, error.message);
    }
  }

  // 2. Utilisateur Auth : supprime en cascade toutes ses lignes en base.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account] deleteUser échoué:", error.message);
    return NextResponse.json({ error: "La suppression a échoué. Contactez le support." }, { status: 500 });
  }

  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ success: true });
}
