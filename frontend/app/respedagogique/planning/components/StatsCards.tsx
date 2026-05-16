
"use client";

import { useMemo } from "react";
import { Session } from "../constants";

interface StatsCardsProps {
  sessions: Session[];
}

export function StatsCards({ sessions }: StatsCardsProps) {
  const stats = useMemo(() => {
    const total = sessions.length;
    const active = sessions.filter((s) => (s.statut as string) === "Actif" || (s.statut as string) === "active" || (s.statut as string) === "Active").length;
    const completed = sessions.filter((s) => (s.statut as string) === "Terminé" || (s.statut as string) === "completed" || (s.statut as string) === "Completed").length;
    const cancelled = sessions.filter((s) => (s.statut as string) === "Annulé" || (s.statut as string) === "cancelled" || (s.statut as string) === "Cancelled").length;

    return [
      {
        label: "Total Sessions",
        value: total,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        bg: "bg-blue-50",
        text: "text-blue-600",
        val: "text-blue-900",
      },
      {
        label: "Sessions Actives",
        value: active,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        val: "text-emerald-900",
      },
      {
        label: "Sessions Terminées",
        value: completed,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
        bg: "bg-indigo-50",
        text: "text-indigo-600",
        val: "text-indigo-900",
      },
      {
        label: "Sessions Annulées",
        value: cancelled,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
        bg: "bg-red-50",
        text: "text-red-500",
        val: "text-red-900",
      },
    ];
  }, [sessions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
        >
          <div className={`inline-flex p-2 rounded-xl ${s.bg} ${s.text} group-hover:scale-110 transition-transform`}>
            {s.icon}
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.val}`}>{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
