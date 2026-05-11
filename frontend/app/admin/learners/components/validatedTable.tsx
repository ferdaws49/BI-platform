"use client";

import { Search, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { PendingApprenant } from "./pendingTable";

// ─────────────────────────────────────────────────────────────
// TYPES PROPS
// ─────────────────────────────────────────────────────────────
interface ValidatedTableProps {
  apprenants: PendingApprenant[]; // filtrés statut = "accepted"
  search: string;
  page: number;
  totalPages: number;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onDelete: (apprenant: PendingApprenant) => void;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function getInitials(nom: string, prenom: string): string {
  const n = (nom || "").trim()[0] ?? "";
  const p = (prenom || "").trim()[0] ?? "";
  return `${n}${p}`.toUpperCase() || "??";
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
];

function getAvatarColor(name: string): string {
  const n = name || "";
  const sum = n.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT : liste des apprenants validés (Tab 2)
// Colonnes : Apprenant | Formations | Téléphone | Date | Actions
// ─────────────────────────────────────────────────────────────
export default function ValidatedTable({
  apprenants,
  search,
  page,
  totalPages,
  onSearchChange,
  onPageChange,
  onDelete,
}: ValidatedTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ── Header : titre + search ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            Liste des apprenants
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {apprenants.length} apprenant{apprenants.length > 1 ? "s" : ""}{" "}
            validé{apprenants.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Champ de recherche */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher apprenant..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none
                       focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 w-56 transition"
          />
        </div>
      </div>

      {/* ── Tableau ── */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 uppercase tracking-widest font-semibold border-b border-gray-50">
            <th className="text-left px-6 py-3">Apprenant</th>
            <th className="text-left px-6 py-3">Formations</th>
            <th className="text-left px-6 py-3">Téléphone</th>
            <th className="text-left px-6 py-3">Inscrit le</th>
            <th className="text-right px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {/* Aucun résultat */}
          {apprenants.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-6 py-14 text-center text-sm text-gray-400"
              >
                Aucun apprenant trouvé
              </td>
            </tr>
          )}

          {apprenants.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
              {/* Apprenant : avatar + nom + email */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center
                                  text-xs font-bold flex-shrink-0 ${getAvatarColor(a.nom)}`}
                  >
                    {getInitials(a.nom, a.prenom)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {a.nom} {a.prenom}
                    </p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                  </div>
                </div>
              </td>

              {/* Formations */}
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {a.formations?.length > 0 ? (
                    a.formations.map((f, idx) => (
                      <span
                        key={`${f.id}-${idx}`}
                        className="text-xs font-medium px-2.5 py-0.5 rounded-full
                                   bg-emerald-50 text-emerald-700 border border-emerald-100"
                      >
                        {f.titre}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              </td>

              {/* Téléphone */}
              <td className="px-6 py-4 text-sm text-gray-500">
                {a.telephone ?? "—"}
              </td>

              {/* Date inscription */}
              <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                {a.dateInscription 
                  ? new Date(a.dateInscription).toLocaleDateString("fr-FR") 
                  : "—"}
              </td>

              {/* Actions */}
              <td className="px-6 py-4">
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => onDelete(a)}
                    title="Supprimer"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500
                               hover:bg-red-50 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-50">
          <span className="text-xs text-gray-400">
            Page {page} sur {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200
                         text-gray-400 hover:bg-emerald-50 hover:text-emerald-700
                         disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={14} />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => onPageChange(i + 1)}
                className={`w-8 h-8 text-xs rounded-lg border transition font-semibold ${
                  page === i + 1
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-gray-200 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200
                         text-gray-400 hover:bg-emerald-50 hover:text-emerald-700
                         disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
