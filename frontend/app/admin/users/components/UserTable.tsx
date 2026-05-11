"use client";

import { Pencil, Trash2, KeyRound, ChevronLeft, ChevronRight } from "lucide-react";
import { UserAvatar, RoleBadge, Toggle } from "./UsersBadges";

// ─────────────────────────────────────────────────────────────
// TYPE : structure d'un utilisateur
//
// ✅ isActive : boolean → activation/désactivation (contrôlé par l'Admin)
// ❌ status "accepted"|"pending"|"rejected" → pas affiché ici (workflow interne)
// ─────────────────────────────────────────────────────────────
export interface User {
  id: number;
  nom: string;
  prenom: string; 
  email: string;
  role: string;      // ID (ex: 'admin')
  roleLabel: string; // Label (ex: 'Admin')
  isActive: boolean;
  creeLe: string;
}

// ─────────────────────────────────────────────────────────────
// TYPES DES PROPS
// ─────────────────────────────────────────────────────────────
interface UsersTableProps {
  users: User[];            // liste paginée à afficher
  page: number;             // page courante
  totalPages: number;       // nombre total de pages
  onPageChange: (p: number) => void;
  onToggleActive: (id: number) => void;   // ← renommé (était onToggleStatut)
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onResetPassword: (user: User) => void;  // ← nouveau : réinitialisation mdp
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT : tableau principal des utilisateurs
// Affiche : avatar, nom, email, rôle, toggle isActive, date, actions
// ─────────────────────────────────────────────────────────────
export default function UsersTable({
  users,
  page,
  totalPages,
  onPageChange,
  onToggleActive,
  onEdit,
  onDelete,
  onResetPassword,
}: UsersTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ── Tableau ───────────────────────────────────────── */}
      <table className="w-full text-sm">

        {/* En-têtes des colonnes */}
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide font-semibold">
            <th className="text-left px-5 py-3">Utilisateur</th>
            <th className="text-left px-5 py-3">Email</th>
            <th className="text-left px-5 py-3">Rôle</th>
            <th className="text-left px-5 py-3">Activation</th>
            <th className="text-left px-5 py-3">Créé le</th>
            <th className="text-left px-5 py-3">Actions</th>
          </tr>
        </thead>

        <tbody>
          {/* Message si aucun résultat */}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                Aucun utilisateur trouvé
              </td>
            </tr>
          )}

          {/* Une ligne par utilisateur */}
          {users.map((u) => (
            <tr
              key={u.id}
              className="border-b border-gray-50 last:border-0 hover:bg-emerald-50/30 transition-colors"
            >
              {/* Colonne : avatar + nom */}
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <UserAvatar name={`${u.prenom || ""} ${u.nom || ""}`.trim()} />
                  <span className="font-medium text-gray-800">
                    {u.prenom || u.nom ? `${u.prenom || ""} ${u.nom || ""}`.trim() : "Utilisateur sans nom"}
                  </span>
                </div>
              </td>

              {/* Colonne : email en police mono */}
              <td className="px-5 py-3 font-mono text-xs text-gray-500">
                {u.email}
              </td>

              {/* Colonne : badge coloré selon le rôle */}
              <td className="px-5 py-3">
                <RoleBadge role={u.roleLabel || u.role} />
              </td>

              {/* Colonne : toggle ON/OFF isActive + label texte */}
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  {/* Toggle appelle PATCH /admin/users/:id/toggle-active */}
                  <Toggle
                    checked={u.isActive}                  /* ← était u.statut === "actif" */
                    onChange={() => onToggleActive(u.id)} /* ← était onToggleStatut */
                  />
                  {/* Label textuel à côté du toggle */}
                  <span className={`text-xs font-medium ${u.isActive ? "text-emerald-600" : "text-gray-400"}`}>
                    {u.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>
              </td>

              {/* Colonne : date de création */}
              <td className="px-5 py-3 text-xs text-gray-400">{u.creeLe}</td>

              {/* Colonne : boutons modifier + reset mdp + supprimer */}
              <td className="px-5 py-3">
                <div className="flex items-center gap-1">

                  {/* Bouton modifier → ouvre le modal en mode édition */}
                  <button
                    onClick={() => onEdit(u)}
                    title="Modifier"
                    className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition"
                  >
                    <Pencil size={13} />
                  </button>

                  {/* Bouton reset mot de passe → envoie email à l'utilisateur */}
                  <button
                    onClick={() => onResetPassword(u)}
                    title="Réinitialiser le mot de passe"
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition"
                  >
                    <KeyRound size={13} />
                  </button>

                  {/* Bouton supprimer → ouvre le dialog de confirmation */}
                  <button
                    onClick={() => onDelete(u)}
                    title="Supprimer"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 size={13} />
                  </button>

                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Pagination (affichée seulement s'il y a plusieurs pages) ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">

          {/* Indicateur de page courante */}
          <span className="text-xs text-gray-400">
            Page {page} sur {totalPages}
          </span>

          {/* Boutons de navigation */}
          <div className="flex gap-1">
            {/* Précédent */}
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200
                         text-gray-400 hover:bg-emerald-50 hover:text-emerald-700
                         disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={13} />
            </button>

            {/* Numéros de pages */}
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => onPageChange(i + 1)}
                className={`w-7 h-7 text-xs rounded-lg border transition font-medium ${
                  page === i + 1
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-gray-200 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {i + 1}
              </button>
            ))}

            {/* Suivant */}
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200
                         text-gray-400 hover:bg-emerald-50 hover:text-emerald-700
                         disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
