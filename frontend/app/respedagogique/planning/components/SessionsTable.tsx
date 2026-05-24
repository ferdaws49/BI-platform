"use client";

import { useState } from "react";
import { Session } from "../constants";

type SortField = "date" | "heureDebut" | "formation" | "formateur" | "statut";

interface SessionsTableProps {
  sessions: Session[];
  loading: boolean;
  onEdit: (session: Session) => void;
  onAnnuler: (id: string) => void;
  onSupprimer: (id: string) => void;
  onAssignFormateur: (session: Session) => void;
  onVoirParticipants: (session: Session) => void;
  onPresence: (session: Session) => void;
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "Actif" | "Terminé" | "Annulé" }) {
  const styles = {
    Actif: "bg-blue-100 text-blue-800",
    Terminé: "bg-emerald-100 text-emerald-800",
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

// ─── Format Date ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Avatar initials ──────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-800 shrink-0">
      {initials || "?"}
    </div>
  );
}

// Helper function to check if a session can be hard deleted according to business rules
function canDeleteSession(session: Session) {
  const todayStr = new Date().toISOString().split("T")[0];
  return session.date >= todayStr && session.statut !== "Terminé";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SessionsTable({
  sessions,
  loading,
  onEdit,
  onAnnuler,
  onSupprimer,
  onAssignFormateur,
  onVoirParticipants,
  onPresence,
}: SessionsTableProps) {
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  /**
   * Toggles sorting for a specific column.
   * If already sorting by that column, flips the direction.
   */
  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const sortIcon = (field: SortField) =>
    sortBy === field ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕";

  // ── Memory-based sorting ──────────────────────────────────────────────────
  const sortedSessions = [...sessions].sort((a, b) => {
    const aVal = (a[sortBy as keyof Session] as string) ?? "";
    const bVal = (b[sortBy as keyof Session] as string) ?? "";
    if (sortBy === "date") {
      return sortDir === "asc"
        ? new Date(aVal).getTime() - new Date(bVal).getTime()
        : new Date(bVal).getTime() - new Date(aVal).getTime();
    }
    return sortDir === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  // ── Pagination logic ──────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sortedSessions.length / pageSize));
  const paged = sortedSessions.slice((page - 1) * pageSize, page * pageSize);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-indigo-100 bg-white shadow-sm p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────────
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-slate-400 text-sm">Aucune session trouvée</p>
        <p className="text-slate-300 text-xs mt-1">
          Essayez de modifier vos filtres
        </p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Liste des sessions
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {sessions.length} session{sessions.length > 1 ? "s" : ""} · cliquer
            sur un en-tête pour trier
          </p>
        </div>
        <span className="text-xs text-indigo-600 font-medium">
          {sortBy} {sortDir === "asc" ? "↑" : "↓"}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
            <tr>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                onClick={() => handleSort("date")}
              >
                Date{sortIcon("date")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                onClick={() => handleSort("heureDebut")}
              >
                Horaire{sortIcon("heureDebut")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                onClick={() => handleSort("formation")}
              >
                Formation{sortIcon("formation")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                onClick={() => handleSort("formateur")}
              >
                Formateur{sortIcon("formateur")}
              </th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Participants</th>
              <th className="px-4 py-3">Revenue</th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                onClick={() => handleSort("statut")}
              >
                Statut{sortIcon("statut")}
              </th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.map((session) => (
              <tr
                key={session.id}
                className="hover:bg-slate-50 transition-colors group"
              >
                {/* Date */}
                <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                  {formatDate(session.date)}
                </td>

                {/* Horaire */}
                <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-xs bg-slate-100 rounded-full px-2.5 py-1 font-mono">
                    {session.heureDebut} – {session.heureFin}
                  </span>
                </td>

                {/* Formation */}
                <td className="px-4 py-3.5">
                  <span className="inline-block rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs font-medium">
                    {session.formation}
                  </span>
                  {session.lieu && (
                    <span className="block text-xs text-slate-400 mt-0.5 pl-1">
                      {session.lieu}
                    </span>
                  )}
                </td>

                {/* Formateur */}
                <td className="px-4 py-3.5">
                  {session.formateur ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={session.formateur} />
                      <span className="text-slate-700 text-sm">
                        {session.formateur}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onAssignFormateur(session)}
                      className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full px-2.5 py-1 transition-colors font-medium"
                    >
                      + Affecter
                    </button>
                  )}
                </td>

                {/* Type */}
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    session.type === "en_ligne" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {session.type === "en_ligne" ? "🌐 En ligne" : "🏫 Présentiel"}
                  </span>
                </td>

                {/* Participants */}
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => onVoirParticipants(session)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full px-2.5 py-1 transition-colors border border-transparent hover:border-indigo-200"
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      session.capacite && (session.apprenants?.length ?? 0) >= session.capacite
                        ? "bg-red-100 text-red-600"
                        : "bg-slate-200 text-slate-600"
                    }`}>
                      {session.apprenants?.length ?? 0}
                    </span>
                    {session.capacite ? (
                      <span className="text-[10px] text-slate-400">/ {session.capacite}</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">voir</span>
                    )}
                  </button>
                </td>

                {/* Revenue */}
                <td className="px-4 py-3.5 font-semibold text-slate-700">
                  {session.revenue?.toLocaleString("fr-TN")} <span className="text-[10px] font-normal text-slate-400">DT</span>
                </td>

                {/* Statut */}
                <td className="px-4 py-3.5">
                  <StatusBadge status={session.statut} />
                </td>

                {/* Actions ────────────────────────────────────────────────── */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Attendance Marking (Only for active sessions with participants) */}
                    {session.statut === "Actif" &&
                      (session.apprenants?.length ?? 0) > 0 && (
                        <button
                          onClick={() => onPresence(session)}
                          title="Marquer les présences"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </button>
                      )}

                    {/* Affecter formateur */}
                    {!session.formateur && (
                      <button
                        onClick={() => onAssignFormateur(session)}
                        title="Affecter un formateur"
                        className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </button>
                    )}

                    {/* Modifier */}
                    {session.statut !== "Annulé" && (
                      <button
                        onClick={() => onEdit(session)}
                        title="Modifier la session"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    )}

                    {/* Annuler */}
                    {session.statut === "Actif" && (
                      <button
                        onClick={() => onAnnuler(session.id)}
                        title="Annuler la session"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}

                    {/* Supprimer définitivement */}
                    {canDeleteSession(session) && (
                      <button
                        onClick={() => onSupprimer(session.id)}
                        title="Supprimer définitivement la session"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          {paged.length > 0 ? (page - 1) * pageSize + 1 : 0}–
          {Math.min(page * pageSize, sessions.length)} sur {sessions.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Précédent
          </button>
          <span className="font-semibold text-indigo-700 px-1">
            {page} / {totalPages}
          </span>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40 transition-colors"
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
