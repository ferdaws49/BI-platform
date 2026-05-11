"use client";

import { Check, X } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// TYPE : Apprenant en attente
// Basé sur l'entité Apprenant (statut = "pending")
// ─────────────────────────────────────────────────────────────
export interface PendingApprenant {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  dateInscription: string;
  statut: "pending" | "accepted" | "rejected";
  programme?: string; // New field
  formations: { id: number; titre: string }[];
}

// ─────────────────────────────────────────────────────────────
// TYPES PROPS
// ─────────────────────────────────────────────────────────────
interface PendingTableProps {
  apprenants: PendingApprenant[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onApproveAll: () => void;
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
// COMPOSANT : tableau des demandes en attente (Tab 1)
// Colonnes : Apprenant | Formation demandée | Date | Actions
// Actions : Rejeter + Approuver par ligne + Tout approuver
// ─────────────────────────────────────────────────────────────
export default function PendingTable({
  apprenants,
  onApprove,
  onReject,
  onApproveAll,
}: PendingTableProps) {
  // Filtrer seulement les pending
  const pending = apprenants.filter((a) => a.statut === "pending");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ── Header : titre + bouton "Tout approuver" ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            Demandes d'inscription
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {pending.length} demande{pending.length > 1 ? "s" : ""} en attente
          </p>
        </div>

        {/* Bouton tout approuver — visible seulement si demandes > 0 */}
        {pending.length > 0 && (
          <button
            onClick={onApproveAll}
            className="flex items-center gap-2 text-sm font-semibold text-emerald-600
                       hover:text-emerald-700 border border-emerald-200 hover:border-emerald-300
                       hover:bg-emerald-50 px-4 py-2 rounded-xl transition"
          >
            <Check size={14} />
            Tout approuver ({pending.length})
          </button>
        )}
      </div>

      {/* ── Tableau ── */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 uppercase tracking-widest font-semibold border-b border-gray-50">
            <th className="text-left px-6 py-3">Apprenant</th>
            <th className="text-left px-6 py-3">Formation demandée</th>
            <th className="text-left px-6 py-3">Date</th>
            <th className="text-right px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {/* Aucune demande */}
          {pending.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="px-6 py-14 text-center text-sm text-gray-400"
              >
                Aucune demande en attente 🎉
              </td>
            </tr>
          )}

          {/* Une ligne par apprenant pending */}
          {pending.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
              {/* Colonne : Avatar + Nom + Email */}
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

              {/* Colonne : Formation(s) demandée(s) */}
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {a.formations?.length > 0 ? (
                    a.formations.map((f, idx) => (
                      <span
                        key={`${f.id}-${idx}`}
                        className="text-xs font-medium px-3 py-1 rounded-full
                                   bg-purple-50 text-purple-700 border border-purple-100"
                      >
                        {f.titre}
                      </span>
                    ))
                  ) : a.programme ? (
                    <span
                      className="text-xs font-medium px-3 py-1 rounded-full
                                 bg-purple-50 text-purple-700 border border-purple-100"
                    >
                      {a.programme}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              </td>

              {/* Colonne : Date d'inscription */}
              <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                {a.dateInscription 
                  ? new Date(a.dateInscription).toLocaleDateString("fr-FR") 
                  : "—"}
              </td>

              {/* Colonne : Actions Rejeter + Approuver */}
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  {/* Bouton Rejeter → statut = "rejected" */}
                  <button
                    onClick={() => onReject(a.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200
                               text-red-500 text-xs font-semibold hover:bg-red-50 transition"
                  >
                    <X size={12} /> Rejeter
                  </button>

                  {/* Bouton Approuver → statut = "accepted" */}
                  <button
                    onClick={() => onApprove(a.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                               bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition"
                  >
                    <Check size={12} /> Approuver
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
