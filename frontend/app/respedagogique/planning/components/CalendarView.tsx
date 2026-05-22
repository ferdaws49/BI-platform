"use client";

import { useState } from "react";
import { Session } from "../constants";

interface CalendarViewProps {
  sessions: Session[];
  loading: boolean;
  onEdit: (session: Session) => void;
  onSupprimer: (id: string) => void;
  onAssignFormateur: (session: Session) => void;
  onVoirParticipants: (session: Session) => void;
  onPresence: (session: Session) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date: Date) {
  const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return day === 0 ? 6 : day - 1; // lundi = 0
}

function getSessionColor(statut: string) {
  switch (statut) {
    case "Actif":
      return "bg-blue-100 border-l-4 border-blue-500 text-blue-900";
    case "Terminé":
      return "bg-emerald-100 border-l-4 border-emerald-500 text-emerald-900";
    case "Annulé":
      return "bg-red-100 border-l-4 border-red-400 text-red-800";
    default:
      return "bg-slate-100 border-l-4 border-slate-400 text-slate-700";
  }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return dateStr;
  }
}

// Helper function to check if a session can be hard deleted according to business rules
function canDeleteSession(session: Session) {
  const todayStr = new Date().toISOString().split("T")[0];
  return session.date >= todayStr && session.statut !== "Terminé";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarView({
  sessions,
  loading,
  onEdit,
  onSupprimer,
  onAssignFormateur,
  onVoirParticipants,
  onPresence,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [popup, setPopup] = useState<{
    session: Session;
    x: number;
    y: number;
  } | null>(null);

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  // Sessions groupées par date
  const sessionsByDate = sessions.reduce<Record<string, Session[]>>(
    (acc, s) => {
      acc[s.date] = [...(acc[s.date] ?? []), s];
      return acc;
    },
    {},
  );

  const prevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  const nextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );

  const handleSessionClick = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopup({ session, x: rect.left, y: rect.bottom + 8 });
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const calendarDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear();

  return (
    <div className="space-y-6" onClick={() => setPopup(null)}>
      {/* Calendar card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg px-3 py-1.5 transition-colors"
          >
            ← Précédent
          </button>
          <h3 className="text-base font-bold text-slate-900 capitalize">
            {monthName}
          </h3>
          <button
            onClick={nextMonth}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg px-3 py-1.5 transition-colors"
          >
            Suivant →
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {days.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold text-slate-400 py-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return (
                <div
                  key={idx}
                  className="min-h-24 bg-slate-50 rounded-lg border border-slate-100"
                />
              );
            }
            const dateStr = `${currentDate.getFullYear()}-${String(
              currentDate.getMonth() + 1,
            ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const daySessions = sessionsByDate[dateStr] ?? [];

            return (
              <div
                key={idx}
                className={`min-h-24 p-1.5 rounded-lg border transition-colors ${
                  isToday(day)
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-100 bg-white hover:bg-slate-50"
                }`}
              >
                <div
                  className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday(day) ? "bg-indigo-600 text-white" : "text-slate-600"
                  }`}
                >
                  {day}
                </div>
                <div className="space-y-0.5">
                  {daySessions.slice(0, 2).map((session) => (
                    <button
                      key={session.id}
                      onClick={(e) => handleSessionClick(e, session)}
                      className={`w-full text-left text-[10px] p-1 rounded cursor-pointer transition-shadow hover:shadow-md ${getSessionColor(
                        session.statut,
                      )}`}
                      title={`${session.formation} — ${session.heureDebut}`}
                    >
                      <div className="font-semibold truncate">
                        {session.heureDebut}
                      </div>
                      <div className="truncate opacity-80">
                        {session.formation}
                      </div>
                    </button>
                  ))}
                  {daySessions.length > 2 && (
                    <p className="text-[10px] text-slate-500 font-medium px-1">
                      +{daySessions.length - 2} autre
                      {daySessions.length - 2 > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">
          {[
            { label: "Actif", color: "bg-blue-500" },
            { label: "Terminé", color: "bg-emerald-500" },
            { label: "Annulé", color: "bg-red-400" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total sessions",
            value: sessions.length,
            color: "from-indigo-50 border-indigo-100 text-indigo-900",
            sub: "text-indigo-400",
          },
          {
            label: "Actives",
            value: sessions.filter((s) => s.statut === "Actif").length,
            color: "from-blue-50 border-blue-100 text-blue-900",
            sub: "text-blue-400",
          },
          {
            label: "Complétées",
            value: sessions.filter((s) => s.statut === "Terminé").length,
            color: "from-emerald-50 border-emerald-100 text-emerald-900",
            sub: "text-emerald-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border bg-gradient-to-br to-white p-4 shadow-sm ${stat.color}`}
          >
            <p
              className={`text-xs font-medium uppercase tracking-wide ${stat.sub}`}
            >
              {stat.label}
            </p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Session Popup */}
      {popup && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 w-72"
          style={{
            top: Math.min(popup.y, window.innerHeight - 280),
            left: Math.min(popup.x, window.innerWidth - 290),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popup header */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900 leading-tight">
                  {popup.session.formation}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 capitalize">
                  {formatDate(popup.session.date)}
                </p>
              </div>
              <button
                onClick={() => setPopup(null)}
                className="p-1 text-slate-300 hover:text-slate-500 transition-colors shrink-0"
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
            </div>
          </div>

          {/* Popup details */}
          <div className="px-4 py-3 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                {popup.session.heureDebut} – {popup.session.heureFin}
              </span>
            </div>
            {popup.session.formateur && (
              <div className="flex items-center gap-2">
                <svg
                  className="w-3.5 h-3.5 text-slate-400 shrink-0"
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
                <span>{popup.session.formateur}</span>
              </div>
            )}
            {popup.session.lieu && (
              <div className="flex items-center gap-2">
                <svg
                  className="w-3.5 h-3.5 text-slate-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                </svg>
                <span>{popup.session.lieu}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>
                {popup.session.apprenants?.length ?? 0} participant
                {(popup.session.apprenants?.length ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Popup actions */}
          <div className="px-4 py-3 border-t border-slate-100 space-y-1.5">
            <button
              onClick={() => {
                onVoirParticipants(popup.session);
                setPopup(null);
              }}
              className="w-full text-left text-xs font-medium text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Voir les participants
            </button>
            {popup.session.statut === "Actif" &&
              (popup.session.apprenants?.length ?? 0) > 0 && (
                <button
                  onClick={() => {
                    onPresence(popup.session);
                    setPopup(null);
                  }}
                  className="w-full text-left text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-3.5 h-3.5"
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
                  Marquer les présences
                </button>
              )}
            {!popup.session.formateur && (
              <button
                onClick={() => {
                  onAssignFormateur(popup.session);
                  setPopup(null);
                }}
                className="w-full text-left text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-3.5 h-3.5"
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
                Affecter un formateur
              </button>
            )}
            {popup.session.statut !== "Annulé" && (
              <button
                onClick={() => {
                  onEdit(popup.session);
                  setPopup(null);
                }}
                className="w-full text-left text-xs font-medium text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-3.5 h-3.5"
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
                Modifier la session
              </button>
            )}

            {canDeleteSession(popup.session) && (
              <button
                onClick={() => {
                  onSupprimer(popup.session.id);
                  setPopup(null);
                }}
                className="w-full text-left text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-3.5 h-3.5"
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
                Supprimer la session
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
