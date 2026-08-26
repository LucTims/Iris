"use client";

import { useEffect, useMemo, useState } from "react";

const fmt = (n: number) => (Number(n) || 0).toLocaleString("fr-FR");

export default function UsersListClient({ initialUsers = [] }: { initialUsers?: any[] }) {
  const [users, setUsers] = useState<any[]>(initialUsers);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur de chargement.");
      setUsers(data.users || []);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changePlan = async (userId: string, newPlan: string) => {
    setLoadingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPlan }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u)));
      } else {
        alert("Erreur : " + data.error);
      }
    } catch {
      alert("Erreur de connexion.");
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.email || "").toLowerCase().includes(q) ||
        (u.full_name || "").toLowerCase().includes(q)
    );
  }, [users, query]);

  const totals = useMemo(
    () => ({
      count: users.length,
      balance: users.reduce((s, u) => s + (Number(u.balance) || 0), 0),
      spent: users.reduce((s, u) => s + (Number(u.coins_spent) || 0), 0),
    }),
    [users]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2 w-full sm:max-w-xs">
          <span className="material-symbols-outlined text-neutral-400 text-lg">search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (email, nom)…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span><strong className="text-neutral-800">{fmt(totals.count)}</strong> utilisateurs</span>
          <span>·</span>
          <span>Soldes cumulés : <strong className="text-amber-600">{fmt(totals.balance)}</strong> 🪙</span>
          <span>·</span>
          <span>Dépensé : <strong className="text-neutral-800">{fmt(totals.spent)}</strong> 🪙</span>
          <button onClick={load} className="ml-1 text-neutral-500 hover:text-secondary" title="Actualiser">
            <span className="material-symbols-outlined text-base">refresh</span>
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm text-neutral-600 min-w-[720px]">
          <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-900">
            <tr>
              <th className="px-4 py-3 font-bold">Utilisateur</th>
              <th className="px-4 py-3 font-bold">Plan</th>
              <th className="px-4 py-3 font-bold text-right">Solde</th>
              <th className="px-4 py-3 font-bold text-right">Dépensé</th>
              <th className="px-4 py-3 font-bold text-right">Projets</th>
              <th className="px-4 py-3 font-bold">Dernière activité</th>
              <th className="px-4 py-3 font-bold text-right">Changer plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-neutral-400">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                      {u.full_name || "Auteur"}
                      {u.role === "admin" && (
                        <span className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">admin</span>
                      )}
                    </div>
                    <div className="text-neutral-400 text-xs">{u.email || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        u.plan === "pro"
                          ? "bg-orange-100 text-secondary"
                          : u.plan === "studio"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-neutral-100 text-neutral-800"
                      }`}
                    >
                      {(u.plan || "free").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-amber-600">{fmt(u.balance)}</td>
                  <td className="px-4 py-3 text-right text-neutral-800">{fmt(u.coins_spent)}</td>
                  <td className="px-4 py-3 text-right text-neutral-600">{fmt(u.projects)}</td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">
                    {u.last_activity ? new Date(u.last_activity).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <select
                        className="border border-neutral-300 rounded-lg px-2 py-1 text-xs outline-none"
                        value={u.plan || "free"}
                        onChange={(e) => changePlan(u.id, e.target.value)}
                        disabled={loadingId === u.id}
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="studio">Studio</option>
                      </select>
                      {loadingId === u.id && (
                        <span className="material-symbols-outlined animate-spin text-sm text-neutral-400">progress_activity</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-neutral-400">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
