"use client";

import { useState } from "react";

export default function UsersListClient({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const changePlan = async (userId: string, newPlan: string) => {
    setLoadingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPlan })
      });
      
      const data = await res.json();
      if (data.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
      } else {
        alert("Erreur : " + data.error);
      }
    } catch (e) {
      alert("Erreur de connexion.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
      <table className="w-full text-left text-sm text-neutral-600">
        <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-900">
          <tr>
            <th className="px-6 py-4 font-bold">Utilisateur (Email)</th>
            <th className="px-6 py-4 font-bold">Prénom / Nom</th>
            <th className="px-6 py-4 font-bold">Plan Actuel</th>
            <th className="px-6 py-4 font-bold text-right">Action (Changer Plan)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-neutral-50/50 transition-colors">
              <td className="px-6 py-4 font-medium text-neutral-900">{u.email}</td>
              <td className="px-6 py-4">{u.full_name}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  u.plan === 'pro' ? 'bg-orange-100 text-secondary' :
                  u.plan === 'studio' ? 'bg-purple-100 text-purple-800' :
                  'bg-neutral-100 text-neutral-800'
                }`}>
                  {u.plan.toUpperCase()}
                </span>
              </td>
              <td className="px-6 py-4 text-right flex justify-end gap-2">
                <select 
                  className="border border-neutral-300 rounded px-2 py-1 text-xs outline-none"
                  value={u.plan}
                  onChange={(e) => changePlan(u.id, e.target.value)}
                  disabled={loadingId === u.id}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="studio">Studio</option>
                </select>
                {loadingId === u.id && <span className="material-symbols-outlined animate-spin text-sm text-neutral-400">progress_activity</span>}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-neutral-400">
                Aucun utilisateur trouvé.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
