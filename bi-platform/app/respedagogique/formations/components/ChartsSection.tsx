"use client";

import { useEffect, useRef } from "react";
import { Chart as ChartJS, registerables } from "chart.js";

ChartJS.register(...registerables);

type Formation = {
  id: string;
  nom: string;
  nbInscrits: number;
  tauxSucces: number;
  tauxAbandon: number;
  tauxCompletion: number;
  satisfaction: number;
};

type Filters = {
  periode: string;
  formation: string;
  formateur: string;
  promotion: string;
  statut: string;
};

interface ChartsSectionProps {
  formations: Formation[];
  loading: boolean;
  filters: Filters;
}

// ─── Chart Components ─────────────────────────────────────────────────────────

function SuccessRateBarChart({ formations }: { formations: Formation[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !formations.length) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    chartRef.current = new ChartJS(ctx, {
      type: "bar",
      data: {
        labels: formations.map((f) => f.nom),
        datasets: [
          {
            label: "Taux de Succès (%)",
            data: formations.map((f) => f.tauxSucces),
            backgroundColor: "rgba(34, 197, 94, 0.8)",
            borderColor: "rgb(34, 197, 94)",
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            labels: { color: "#6b7280", font: { size: 12 } },
          },
          tooltip: {
            mode: "index",
            callbacks: {
              label: function (context) {
                return `${(context.parsed.y ?? 0).toFixed(1)}%`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { color: "#6b7280", font: { size: 11 } },
          },
          x: {
            grid: { display: false },
            ticks: { color: "#6b7280", font: { size: 11 } },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [formations]);

  return (
    <div className="relative h-64 w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}

function SuccessRateLineChart({ formations }: { formations: Formation[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !formations.length) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Create time-series data by sorting formations (simulating evolution)
    const sortedFormations = [...formations].sort((a, b) =>
      a.nom.localeCompare(b.nom),
    );

    chartRef.current = new ChartJS(ctx, {
      type: "line",
      data: {
        labels: sortedFormations.map((f) => f.nom),
        datasets: [
          {
            label: "Évolution du Taux de Succès",
            data: sortedFormations.map((f) => f.tauxSucces),
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "rgb(59, 130, 246)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            labels: { color: "#6b7280", font: { size: 12 } },
          },
          tooltip: {
            mode: "index",
            callbacks: {
              label: function (context: any) {
                const value = context.parsed?.y ?? 0;
                return `${value.toFixed(1)}%`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { color: "#6b7280", font: { size: 11 } },
          },
          x: {
            grid: { display: false },
            ticks: { color: "#6b7280", font: { size: 11 } },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [formations]);

  return (
    <div className="relative h-64 w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}

// ─── Stat Cards ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className: string }>;
}) {
  return (
    <div className="rounded-lg border border-green-100 bg-white p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-green-600" />
        <div>
          <p className="text-xs text-gray-600">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChartsSection({
  formations,
  loading,
  filters,
}: ChartsSectionProps) {
  const totalFormations = formations.length;
  const totalEnrollments = formations.reduce((sum, f) => sum + f.nbInscrits, 0);
const avgSuccess =
  formations.length > 0
    ? `${(formations.reduce((sum, f) => sum + (f.tauxSucces ?? 0), 0) / formations.length).toFixed(1)}%`
    : "0.0%";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-green-50 rounded-lg animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-72 bg-green-50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Total Formations"
          value={totalFormations}
          icon={BookIcon}
        />
        <StatCard
          label="Total Inscrits"
          value={totalEnrollments}
          icon={UsersIcon}
        />
<StatCard label="Succès Moyen" value={avgSuccess} icon={TrendIcon} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            Taux de Succès par Formation
          </h3>
          <SuccessRateBarChart formations={formations} />
        </div>

        <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            Évolution Taux de Succès
          </h3>
          <SuccessRateLineChart formations={formations} />
        </div>
      </div>
    </div>
  );
}

// ─── Icon Components ──────────────────────────────────────────────────────────

function BookIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
    </svg>
  );
}

function UsersIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM9 6a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function TrendIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  );
}
