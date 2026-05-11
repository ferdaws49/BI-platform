"use client";

import { useState } from "react";

/**
 * Type local pour les performances, aligné sur les données reçues de l'API.
 */
type FormateurPerf = {
  id: number;
  nom: string;
  specialite: string;
  scoreEfficacite: number;
  tauxReussite: number;
  satisfaction: number;
  sessionsAnimees: number;
  totalApprenants: number;
};

// Champs sur lesquels on peut effectuer un tri
type SortField = keyof Omit<FormateurPerf, "id">;

interface PerformanceTableProps {
  formateurs: FormateurPerf[];
  loading: boolean;
}

// ─── Composants de présentation internes ─────────────────────────────────────

/**
 * Affiche une note sous forme d'étoiles (1 à 5).
 */
function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-3 h-3 ${
            i <= Math.round(value) ? "text-amber-400" : "text-gray-200"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/**
 * Barre de progression horizontale pour les pourcentages (ex: taux de réussite).
 */
function ProgressBar({
  value,
  color = "bg-green-500",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

/**
 * Badge de score coloré selon la performance (Vert > 90, Bleu > 80, etc.).
 */
function ScoreBadge({ score }: { score: number }) {
  let color = "bg-red-100 text-red-800";
  if (score >= 90) color = "bg-green-100 text-green-800";
  else if (score >= 80) color = "bg-blue-100 text-blue-800";
  else if (score >= 70) color = "bg-amber-100 text-amber-800";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}
    >
      {score}/100
    </span>
  );
}

// ─── Composant Principal ───────────────────────────────────────────────────────

/**
 * Tableau interactif affichant les détails de performance par formateur.
 * Supporte le tri par colonne et la pagination.
 */
export default function PerformanceTable({
  formateurs,
  loading,
}: PerformanceTableProps) {
  // État pour le tri : par défaut sur le score d'efficacité décroissant
  const [sortBy, setSortBy] = useState<SortField>("scoreEfficacite");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // État pour la pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  /**
   * Gère le changement de tri au clic sur un en-tête de colonne.
   */
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // Inverser la direction si on clique sur la même colonne
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      // Nouveau champ de tri, direction décroissante par défaut
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1); // Retour à la première page lors d'un tri
  };

  // 1. Tri des données en mémoire
  const sortedFormateurs = [...formateurs].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    // Pour le nom (string)
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return 0;
  });

  // 2. Calcul de la pagination
  const totalPages = Math.max(1, Math.ceil(sortedFormateurs.length / pageSize));
  const pagedFormateurs = sortedFormateurs.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  // ── État de chargement ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-green-100 bg-white shadow-sm p-6">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-green-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-100 bg-white shadow-sm overflow-hidden">
      {/* En-tête du tableau avec rappel du tri actif */}
      <div className="px-6 py-4 border-b border-green-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Détails des Formateurs
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {formateurs.length} formateur{formateurs.length > 1 ? "s" : ""} ·
              Cliquer sur un en-tête pour trier
            </p>
          </div>
          <div className="text-xs text-gray-500">
            Tri actuel :{" "}
            <span className="font-semibold text-green-800 capitalize">
              {sortBy.replace(/([A-Z])/g, " $1")}{" "}
              {sortDir === "asc" ? "↑" : "↓"}
            </span>
          </div>
        </div>
      </div>

      {/* Tableau HTML */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-green-50 text-xs uppercase text-gray-600 font-semibold">
            <tr>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-green-100 transition-colors select-none"
                onClick={() => handleSort("nom")}
              >
                Nom {sortBy === "nom" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
              </th>
              <th className="px-4 py-3 text-center">Spécialité</th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-green-100 transition-colors select-none text-center"
                onClick={() => handleSort("scoreEfficacite")}
              >
                Efficacité{" "}
                {sortBy === "scoreEfficacite"
                  ? sortDir === "asc"
                    ? "↑"
                    : "↓"
                  : "↕"}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-green-100 transition-colors select-none text-center"
                onClick={() => handleSort("tauxReussite")}
              >
                Réussite{" "}
                {sortBy === "tauxReussite"
                  ? sortDir === "asc"
                    ? "↑"
                    : "↓"
                  : "↕"}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-green-100 transition-colors select-none text-center"
                onClick={() => handleSort("satisfaction")}
              >
                Satisfaction{" "}
                {sortBy === "satisfaction"
                  ? sortDir === "asc"
                    ? "↑"
                    : "↓"
                  : "↕"}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-green-100 transition-colors select-none text-center"
                onClick={() => handleSort("sessionsAnimees")}
              >
                Sessions{" "}
                {sortBy === "sessionsAnimees"
                  ? sortDir === "asc"
                    ? "↑"
                    : "↓"
                  : "↕"}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-green-100 transition-colors select-none text-center"
                onClick={() => handleSort("totalApprenants")}
              >
                Apprenants{" "}
                {sortBy === "totalApprenants"
                  ? sortDir === "asc"
                    ? "↑"
                    : "↓"
                  : "↕"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pagedFormateurs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-400 text-sm"
                >
                  Aucun formateur à afficher
                </td>
              </tr>
            ) : (
              pagedFormateurs.map((f) => (
                <tr key={f.id} className="hover:bg-green-50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-gray-800">
                    {f.nom}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                      {f.specialite}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <ScoreBadge score={f.scoreEfficacite} />
                  </td>
                  <td className="px-4 py-3.5">
                    <ProgressBar value={f.tauxReussite} color="bg-green-500" />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StarRating value={f.satisfaction} />
                  </td>
                  <td className="px-4 py-3.5 text-center text-gray-700 font-medium">
                    {f.sessionsAnimees}
                  </td>
                  <td className="px-4 py-3.5 text-center text-gray-700 font-medium">
                    {f.totalApprenants}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-green-100 flex items-center justify-between text-xs text-gray-500">
        <span>
          Affichage {pagedFormateurs.length > 0 ? (page - 1) * pageSize + 1 : 0}{" "}
          à {Math.min(page * pageSize, formateurs.length)} sur{" "}
          {formateurs.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-green-200 px-3 py-1.5 hover:bg-green-50 disabled:opacity-40 transition-colors"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Précédent
          </button>
          <span className="font-semibold text-green-800 px-2">
            {page} / {totalPages}
          </span>
          <button
            className="rounded-md border border-green-200 px-3 py-1.5 hover:bg-green-50 disabled:opacity-40 transition-colors"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Suivant →
          </button>
        </div>
      </div>
    </div>
  );
}
