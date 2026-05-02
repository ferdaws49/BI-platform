"use client";

import { useState } from "react";

type Student = {
  id: string;
  nom: string;
  formation: string;
  statut: "Actif" | "Terminé" | "Annulé";
  scoreMoyen: number;
  tauxCompletion: number;
  email?: string;
  promotion?: string;
};

type SortField = keyof Omit<Student, "id" | "email" | "promotion">;

interface StudentsTableProps {
  students: Student[];
  loading: boolean;
}

// ─── Status Badge ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "Actif" | "Terminé" | "Annulé" }) {
  const styles = {
    Actif: "bg-blue-100 text-blue-800",
    Terminé: "bg-green-100 text-green-800",
    Annulé: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Score Badge ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  let color = "bg-red-100 text-red-800";
  if (score >= 80) color = "bg-green-100 text-green-800";
  else if (score >= 70) color = "bg-blue-100 text-blue-800";
  else if (score >= 60) color = "bg-amber-100 text-amber-800";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}
    >
      {score.toFixed(1)}/100
    </span>
  );
}

// ─── Progress Bar Component ──────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  let color = "bg-red-500";
  if (value >= 80) color = "bg-green-500";
  else if (value >= 70) color = "bg-blue-500";
  else if (value >= 50) color = "bg-amber-500";

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentsTable({
  students,
  loading,
}: StudentsTableProps) {
  const [sortBy, setSortBy] = useState<SortField>("scoreMoyen");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  // Sort students
  const sortedStudents = [...students].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / pageSize));
  const pagedStudents = sortedStudents.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  // ── Loading State ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-blue-100 bg-white shadow-sm p-6">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-blue-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-blue-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Liste des Apprenants
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {students.length} apprenant{students.length > 1 ? "s" : ""} ·
              Cliquer sur un en-tête pour trier
            </p>
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-semibold text-blue-800">
              {sortBy} {sortDir === "asc" ? "↑" : "↓"}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-blue-50 text-xs uppercase text-gray-600 font-semibold">
            <tr>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-blue-100 transition-colors select-none"
                onClick={() => handleSort("nom")}
              >
                Nom {sortBy === "nom" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-blue-100 transition-colors select-none"
                onClick={() => handleSort("formation")}
              >
                Formation{" "}
                {sortBy === "formation" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
              </th>
              <th className="px-4 py-3 text-center">Statut</th>
              <th
                className="px-4 py-3 text-center cursor-pointer hover:bg-blue-100 transition-colors select-none"
                onClick={() => handleSort("scoreMoyen")}
              >
                Score{" "}
                {sortBy === "scoreMoyen"
                  ? sortDir === "asc"
                    ? "↑"
                    : "↓"
                  : "↕"}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-blue-100 transition-colors select-none"
                onClick={() => handleSort("tauxCompletion")}
              >
                Complétion{" "}
                {sortBy === "tauxCompletion"
                  ? sortDir === "asc"
                    ? "↑"
                    : "↓"
                  : "↕"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pagedStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gray-400 text-sm"
                >
                  Aucun apprenant à afficher
                </td>
              </tr>
            ) : (
              pagedStudents.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-blue-50 transition-colors"
                >
                  <td className="px-4 py-3.5 font-medium text-gray-800">
                    {student.nom}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">
                    <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                      {student.formation}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge status={student.statut} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <ScoreBadge score={student.scoreMoyen} />
                  </td>
                  <td className="px-4 py-3.5">
                    <ProgressBar value={student.tauxCompletion} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-blue-100 flex items-center justify-between text-xs text-gray-500">
        <span>
          Affichage {pagedStudents.length > 0 ? (page - 1) * pageSize + 1 : 0} à{" "}
          {Math.min(page * pageSize, students.length)} sur {students.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-blue-200 px-3 py-1.5 hover:bg-blue-50 disabled:opacity-40 transition-colors"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Précédent
          </button>
          <span className="font-semibold text-blue-800 px-2">
            {page} / {totalPages}
          </span>
          <button
            className="rounded-md border border-blue-200 px-3 py-1.5 hover:bg-blue-50 disabled:opacity-40 transition-colors"
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
