"use client";

import { useState } from "react";

type Formation = {
  id: string;
  nom: string;
  nbInscrits: number;
  tauxSucces: number;
  tauxAbandon: number;
  tauxCompletion: number;
  satisfaction: number;
};

type SortField = keyof Omit<Formation, "id">;

interface FormationsTableProps {
  formations: Formation[];
  loading: boolean;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ value }: { value: number }) {
  const safe = value ?? 0; // ✅ garde contre undefined/null
  let color = "bg-red-100 text-red-800";
  if (safe >= 80) color = "bg-green-100 text-green-800";
  else if (safe >= 60) color = "bg-blue-100 text-blue-800";
  else if (safe >= 40) color = "bg-amber-100 text-amber-800";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}
    >
      {safe.toFixed(1)}%
    </span>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({
  value,
  color = "green",
}: {
  value: number;
  color?: "green" | "blue" | "amber" | "red";
}) {
  const safe = value ?? 0; // ✅ garde contre undefined/null
  const colorClasses = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]}`}
          style={{ width: `${Math.min(safe, 100)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">
        {safe.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ value }: { value: number }) {
  const safe = value ?? 0; // ✅ garde contre undefined/null
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${
            i <= Math.round(safe) ? "text-yellow-400" : "text-gray-300"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-700">
        {safe.toFixed(1)}/5
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FormationsTable({
  formations,
  loading,
}: FormationsTableProps) {
  const [sortBy, setSortBy] = useState<SortField>("tauxSucces");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "nom" ? "asc" : "desc");
    }
    setPage(1);
  };

  const sortedFormations = [...formations].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (typeof aVal === "number" && typeof bVal === "number")
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    if (typeof aVal === "string" && typeof bVal === "string")
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedFormations.length / pageSize));
  const pagedFormations = sortedFormations.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-green-100 bg-white shadow-sm p-6">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-green-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-green-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-green-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Toutes les Formations
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {formations.length} formations · Cliquer sur un en-tête pour trier
            </p>
          </div>
          <span className="text-xs font-semibold text-green-800">
            {sortBy} {sortDir === "asc" ? "↑" : "↓"}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-green-50 text-xs uppercase text-gray-600 font-semibold">
            <tr>
              {(
                [
                  { field: "nom",            label: "Formation"  },
                  { field: "nbInscrits",     label: "Inscrits"   },
                  { field: "tauxSucces",     label: "Succès"     },
                  { field: "tauxAbandon",    label: "Abandon"    },
                  { field: "tauxCompletion", label: "Achèvement" },
                  { field: "satisfaction",   label: "Satisfaction" },
                ] as { field: SortField; label: string }[]
              ).map(({ field, label }) => (
                <th
                  key={field}
                  className="px-4 py-3 cursor-pointer hover:bg-green-100 transition-colors select-none"
                  onClick={() => handleSort(field)}
                >
                  {label}{" "}
                  {sortBy === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pagedFormations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Aucune formation à afficher
                </td>
              </tr>
            ) : (
              pagedFormations.map((formation) => (
                <tr key={formation.id} className="hover:bg-green-50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-gray-800">
                    {formation.nom}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-block rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-800 font-semibold">
                      {formation.nbInscrits}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge value={formation.tauxSucces} />
                  </td>
                  <td className="px-4 py-3.5">
                    <ProgressBar value={formation.tauxAbandon} color="red" />
                  </td>
                  <td className="px-4 py-3.5">
                    <ProgressBar value={formation.tauxCompletion} color="blue" />
                  </td>
                  <td className="px-4 py-3.5">
                    <StarRating value={formation.satisfaction} />
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
          Affichage{" "}
          {pagedFormations.length > 0 ? (page - 1) * pageSize + 1 : 0} à{" "}
          {Math.min(page * pageSize, formations.length)} sur {formations.length}
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