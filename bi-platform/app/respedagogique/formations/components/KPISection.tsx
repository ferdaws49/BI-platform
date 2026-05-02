"use client";

import { useMemo } from "react";

type Formation = {
  id: string;
  nom: string;
  nbInscrits: number;
  tauxSucces: number;
  tauxAbandon: number;
  tauxCompletion: number;
  satisfaction: number;
};

interface KPISectionProps {
  formations: Formation[];
  loading: boolean;
}

// ─── KPI Card Component ───────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  unit,
  icon: Icon,
  loading,
  color = "green",
}: {
  label: string;
  value: number;
  unit: string;
  icon: React.ComponentType<{ className: string }>;
  loading: boolean;
  color?: "green" | "blue" | "amber" | "red" | "purple";
}) {
  const colorClasses = {
    green: "bg-green-50 border-green-100 text-green-900",
    blue: "bg-blue-50 border-blue-100 text-blue-900",
    amber: "bg-amber-50 border-amber-100 text-amber-900",
    red: "bg-red-50 border-red-100 text-red-900",
    purple: "bg-purple-50 border-purple-100 text-purple-900",
  };

  const iconColorClasses = {
    green: "text-green-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
    red: "text-red-600",
    purple: "text-purple-600",
  };

  return (
    <div
      className={`rounded-xl border p-5 shadow-sm transition-all ${colorClasses[color]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-75">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="mt-1 text-2xl font-bold">
              {value.toFixed(1)}
              <span className="text-sm ml-1">{unit}</span>
            </p>
          )}
        </div>
        <Icon className={`h-6 w-6 ${iconColorClasses[color]} opacity-60`} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KPISection({ formations, loading }: KPISectionProps) {
  const stats = useMemo(() => {
    if (!formations.length) {
      return {
        avgSuccessRate: 0,
        avgDropoutRate: 0,
        avgCompletionRate: 0,
        avgSatisfaction: 0,
      };
    }

    const avgSuccessRate =
      formations.reduce((sum, f) => sum + f.tauxSucces, 0) / formations.length;
    const avgDropoutRate =
      formations.reduce((sum, f) => sum + f.tauxAbandon, 0) / formations.length;
    const avgCompletionRate =
      formations.reduce((sum, f) => sum + f.tauxCompletion, 0) /
      formations.length;
    const avgSatisfaction =
      formations.reduce((sum, f) => sum + f.satisfaction, 0) /
      formations.length;

    return {
      avgSuccessRate,
      avgDropoutRate,
      avgCompletionRate,
      avgSatisfaction,
    };
  }, [formations]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Taux de Succès Moyen"
        value={stats.avgSuccessRate}
        unit="%"
        icon={CheckCircle}
        loading={loading}
        color="green"
      />
      <KPICard
        label="Taux d'Abandon Moyen"
        value={stats.avgDropoutRate}
        unit="%"
        icon={AlertCircle}
        loading={loading}
        color="red"
      />
      <KPICard
        label="Taux d'Achèvement Moyen"
        value={stats.avgCompletionRate}
        unit="%"
        icon={CheckSquare}
        loading={loading}
        color="blue"
      />
      <KPICard
        label="Satisfaction Moyenne"
        value={stats.avgSatisfaction}
        unit="/5"
        icon={Star}
        loading={loading}
        color="purple"
      />
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckCircle({ className }: { className: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AlertCircle({ className }: { className: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckSquare({ className }: { className: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Star({ className }: { className: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
