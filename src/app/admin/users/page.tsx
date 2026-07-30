import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import UsersListClient from "./UsersListClient";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== "www.martau@gmail.com") {
    redirect("/dashboard");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-2">Configuration Manquante</h2>
          <p>La clé <strong>SUPABASE_SERVICE_ROLE_KEY</strong> est manquante dans votre fichier <code>.env.local</code>.</p>
        </div>
      </div>
    );
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Récupérer les utilisateurs (avec leur email) depuis l'authentification
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  const authUsers = authData?.users || [];

  // Récupérer les profils (pour les plans et noms)
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Fusionner les deux
  const mergedUsers = authUsers.map(authUser => {
    const profile = profiles?.find(p => p.id === authUser.id) || {};
    return {
      id: authUser.id,
      email: authUser.email,
      full_name: profile.full_name || authUser.user_metadata?.full_name || "Sans nom",
      plan: profile.plan || "free",
      created_at: profile.created_at || authUser.created_at
    };
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Utilisateurs</h1>
          <p className="text-neutral-500 text-sm mt-1">Gérez les abonnements et consultez les fiches auteurs.</p>
        </div>
      </div>
      <UsersListClient initialUsers={mergedUsers} />
    </div>
  );
}
