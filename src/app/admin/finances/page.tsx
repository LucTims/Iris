import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export default async function AdminFinancesPage() {
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

  const { data: transactions } = await supabaseAdmin
    .from("transactions")
    .select(`
      id,
      amount,
      status,
      plan_id,
      created_at,
      profiles ( email )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Transactions & Finances</h1>
          <p className="text-neutral-500 text-sm mt-1">Suivez les paiements SebPay en temps réel.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-neutral-600">
          <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-900">
            <tr>
              <th className="px-6 py-4 font-bold">Date</th>
              <th className="px-6 py-4 font-bold">Utilisateur (Email)</th>
              <th className="px-6 py-4 font-bold">Plan Choisi</th>
              <th className="px-6 py-4 font-bold">Montant</th>
              <th className="px-6 py-4 font-bold text-right">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {transactions?.map((tx: any) => (
              <tr key={tx.id} className="hover:bg-neutral-50/50 transition-colors">
                <td className="px-6 py-4">{new Date(tx.created_at).toLocaleString("fr-FR")}</td>
                <td className="px-6 py-4 font-medium text-neutral-900">{tx.profiles?.email || "Inconnu"}</td>
                <td className="px-6 py-4">{tx.plan_id}</td>
                <td className="px-6 py-4 font-bold">{tx.amount.toLocaleString("fr-FR")} FCFA</td>
                <td className="px-6 py-4 text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    tx.status === 'success' ? 'bg-emerald-100 text-emerald-800' :
                    tx.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {tx.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
            {(!transactions || transactions.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-neutral-400">
                  Aucune transaction trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
