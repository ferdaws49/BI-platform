"use client";

import { Search, Plus } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface UsersToolbarProps {
  search: string;
  roleFilter: string;
  roles: { id: string; label: string }[];
  totalCount: number;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onAddClick: () => void;
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT : barre d'outils au-dessus du tableau
// Contient : champ de recherche + filtre par rôle + bouton "Ajouter"
// ─────────────────────────────────────────────────────────────
export default function UsersToolbar({
  search,
  roleFilter,
  roles,
  totalCount,
  onSearchChange,
  onRoleFilterChange,
  onAddClick,
}: UsersToolbarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center justify-between">

      {/* ── Gauche : Recherche + Filtre rôle + compteur ── */}
      <div className="flex gap-3 flex-wrap flex-1 items-center">

        {/* Champ de recherche par nom ou email */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher nom, email..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none
                       focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 w-64 transition"
          />
        </div>

        {/* Dropdown filtre par rôle */}
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600
                     outline-none focus:ring-2 focus:ring-emerald-200 bg-white transition"
        >
          <option value="">Tous les rôles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>

        {/* Compteur dynamique du nombre d'utilisateurs filtrés */}
        <span className="text-xs text-gray-400 self-center">
          {totalCount} utilisateur{totalCount > 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Droite : Bouton ajouter un utilisateur ── */}
      <button
        onClick={onAddClick}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
                   text-white text-sm font-medium px-4 py-2 rounded-xl transition"
      >
        <Plus size={15} />
        Nouvel utilisateur
      </button>
    </div>
  );
}
