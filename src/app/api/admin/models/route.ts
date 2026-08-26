import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, msg: "Non autorisé" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin" || user.email === "www.martau@gmail.com";
  if (!isAdmin) return { ok: false as const, status: 403, msg: "Accès réservé aux administrateurs." };
  return { ok: true as const, user };
}

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// GET — tous les modèles IA et leurs tarifs (actifs et inactifs).
export async function GET() {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.msg }, { status: guard.status });
  const { data, error } = await admin()
    .from("ai_models")
    .select("id, name, provider, model_id, input_cost_per_1m, output_cost_per_1m, active")
    .order("model_id");
  if (error) return NextResponse.json({ error: "Erreur de chargement." }, { status: 500 });
  return NextResponse.json({ models: data || [] });
}

// PATCH — mettre à jour le tarif / l'état d'un modèle.
export async function PATCH(req: Request) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.msg }, { status: guard.status });

  const { id, input_cost_per_1m, output_cost_per_1m, active } = await req.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (input_cost_per_1m !== undefined) patch.input_cost_per_1m = Number(input_cost_per_1m);
  if (output_cost_per_1m !== undefined) patch.output_cost_per_1m = Number(output_cost_per_1m);
  if (active !== undefined) patch.active = !!active;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });

  const { error } = await admin().from("ai_models").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "Échec de la mise à jour." }, { status: 500 });
  return NextResponse.json({ success: true });
}
