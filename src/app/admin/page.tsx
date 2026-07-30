import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Vérification Server-Side stricte
  if (!user || user.email !== "www.martau@gmail.com") {
    redirect("/dashboard");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-2">Configuration Manquante</h2>
          <p>La clé <strong>SUPABASE_SERVICE_ROLE_KEY</strong> est manquante dans votre fichier <code>.env.local</code>.</p>
          <p className="mt-2 text-sm">Veuillez l'ajouter pour autoriser ce panneau d'administration à lire toutes les données de Supabase sans restriction RLS.</p>
        </div>
      </div>
    );
  }

  // Initialisation du client admin (bypasse RLS)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Récupération des statistiques globales
  const [usersRes, projRes, aiRes, txRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("projects").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("ai_usage").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("transactions").select("amount, status").eq("status", "success")
  ]);

  const usersCount = usersRes.count || 0;
  const projectsCount = projRes.count || 0;
  const aiUsageCount = aiRes.count || 0;
  
  // Calcul du MRR (somme de toutes les transactions réussies)
  // Normalement le MRR est sur le mois en cours, mais pour l'instant on fait un total
  const totalRevenue = txRes.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Vue d'Ensemble & KPIs</h1>
        <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">Supabase Admin Role</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">group</span>
            </div>
          </div>
          <span className="text-xs font-bold text-neutral-500 uppercase">Utilisateurs Inscrits</span>
          <p className="text-4xl font-black text-neutral-900 mt-2">{usersCount}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">auto_stories</span>
            </div>
          </div>
          <span className="text-xs font-bold text-neutral-500 uppercase">Projets de Livres Total</span>
          <p className="text-4xl font-black text-secondary mt-2">{projectsCount}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600">payments</span>
            </div>
          </div>
          <span className="text-xs font-bold text-neutral-500 uppercase">Revenu Total (FCFA)</span>
          <p className="text-4xl font-black text-emerald-600 mt-2">{totalRevenue.toLocaleString("fr-FR")} F</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">psychology</span>
            </div>
          </div>
          <span className="text-xs font-bold text-neutral-500 uppercase">Appels / Générations IA</span>
          <p className="text-4xl font-black text-blue-600 mt-2">{aiUsageCount}</p>
        </div>
      </div>
    </div>
  );
}
