"use client";

import type { FilterOptions as SharedFilterOptions } from "@/context/FilterContext";
import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

type FilterOptions = SharedFilterOptions & { promotion?: string };

type ChartDataPoint = {
  label: string;
  value: number;
};

type TrendData = {
  date: string;
  reussite: number;
  abandon: number;
};

type FormationComparison = {
  formation: string;
  tauxReussite: number;
  apprenants: number;
};

type PromotionComparison = {
  promotion: string;
  tauxReussite: number;
  tauxAbandon: number;
  satisfaction: number;
};

// ─── Static Fallback Data ─────────────────────────────────────────────────────

const staticTrendData: TrendData[] = [
  { date: "Semaine 1", reussite: 82, abandon: 6.1 },
  { date: "Semaine 2", reussite: 84, abandon: 5.8 },
  { date: "Semaine 3", reussite: 83, abandon: 5.2 },
  { date: "Semaine 4", reussite: 86, abandon: 4.9 },
  { date: "Semaine 5", reussite: 85, abandon: 4.5 },
  { date: "Semaine 6", reussite: 86.4, abandon: 4.2 },
];

const staticFormationData: FormationComparison[] = [
  { formation: "Data Science", tauxReussite: 91, apprenants: 32 },
  { formation: "Full-Stack", tauxReussite: 87, apprenants: 45 },
  { formation: "UX/UI Design", tauxReussite: 84, apprenants: 28 },
  { formation: "Cloud & DevOps", tauxReussite: 78, apprenants: 38 },
  { formation: "Intelligence IA", tauxReussite: 95, apprenants: 22 },
  { formation: "Cybersécurité", tauxReussite: 72, apprenants: 18 },
];

const staticPromotionData: PromotionComparison[] = [
  {
    promotion: "Promo 2024-A",
    tauxReussite: 89,
    tauxAbandon: 3.5,
    satisfaction: 4.7,
  },
  {
    promotion: "Promo 2024-B",
    tauxReussite: 82,
    tauxAbandon: 5.8,
    satisfaction: 4.5,
  },
];

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-4 bg-green-50 rounded w-40 mb-4" />
      <div className="h-64 bg-green-50 rounded" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChartsSection({ filters }: { filters: FilterOptions }) {
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendData[]>(staticTrendData);
  const [formationData, setFormationData] =
    useState<FormationComparison[]>(staticFormationData);
  const [promotionData, setPromotionData] =
    useState<PromotionComparison[]>(staticPromotionData);

  // ── Fetch from backend ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAnalyses = async () => {
      setLoading(true);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("access_token")
            : null;
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        const base = "http://localhost:5000";

        // Build query params
        const params = new URLSearchParams();
        if (filters.periode && filters.periode !== "Ce mois")
          params.append("periode", filters.periode);
        if (filters.formation && filters.formation !== "Tous")
          params.append("formation", filters.formation);
        if (filters.formateur && filters.formateur !== "Tous")
          params.append("formateur", filters.formateur);
        if (filters.promotion && filters.promotion !== "Tous")
          params.append("promotion", filters.promotion);
        if (filters.statut && filters.statut !== "Tous")
          params.append("statut", filters.statut);

        const queryString = params.toString();
        const queryPart = queryString ? `?${queryString}` : "";

        const res = await fetch(
          `${base}/dashboard/pedagogique/analyses${queryPart}`,
          { headers },
        );

        if (res.ok) {
          const data = await res.json();
          setTrendData(data.trends || staticTrendData);
          setFormationData(data.formations || staticFormationData);
          setPromotionData(data.promotions || staticPromotionData);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [filters]);

  // ── Chart Data ──────────────────────────────────────────────────────────────

  // 1. Success rate trend
  const successTrendData = {
    labels: trendData.map((d) => d.date),
    datasets: [
      {
        label: "Taux de Réussite %",
        data: trendData.map((d) => d.reussite),
        borderColor: "#16a34a",
        backgroundColor: "rgba(22,163,74,0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#16a34a",
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  // 2. Dropout rate trend
  const dropoutTrendData = {
    labels: trendData.map((d) => d.date),
    datasets: [
      {
        label: "Taux d'Abandon %",
        data: trendData.map((d) => d.abandon),
        borderColor: "#dc2626",
        backgroundColor: "rgba(220,38,38,0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#dc2626",
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  // 3. Success by formation
  const formationSuccessData = {
    labels: formationData.map((f) => f.formation),
    datasets: [
      {
        label: "Taux de Réussite %",
        data: formationData.map((f) => f.tauxReussite),
        backgroundColor: [
          "#16a34acc",
          "#15803dcc",
          "#22c55ecc",
          "#84cc16cc",
          "#fbbf24cc",
          "#ef4444cc",
        ],
        borderColor: [
          "#166534",
          "#15803d",
          "#22c55e",
          "#84cc16",
          "#fbbf24",
          "#ef4444",
        ],
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  // 4. Promotion comparison
  const promotionComparisonData = {
    labels: promotionData.map((p) => p.promotion),
    datasets: [
      {
        label: "Taux de Réussite %",
        data: promotionData.map((p) => p.tauxReussite),
        backgroundColor: "#16a34acc",
        borderColor: "#166534",
        borderWidth: 1.5,
        borderRadius: 6,
      },
      {
        label: "Taux d'Abandon %",
        data: promotionData.map((p) => p.tauxAbandon),
        backgroundColor: "#dc2626cc",
        borderColor: "#991b1b",
        borderWidth: 1.5,
        borderRadius: 6,
      },
      {
        label: "Satisfaction /5",
        data: promotionData.map((p) => p.satisfaction * 20), // Scale to percentage
        backgroundColor: "#f59e0bcc",
        borderColor: "#b45309",
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  // ── Common chart options ────────────────────────────────────────────────────
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { font: { size: 11 }, boxWidth: 12, padding: 12 },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: 12,
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${context.raw}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#9ca3af", font: { size: 10 } },
      },
      y: {
        grid: { color: "#f3f4f6" },
        border: { display: false },
        ticks: {
          color: "#9ca3af",
          font: { size: 10 },
          callback: (v: any) => `${v}%`,
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "x" as const,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { font: { size: 11 }, boxWidth: 12, padding: 12 },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: 12,
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${context.raw}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#9ca3af", font: { size: 10 } },
      },
      y: {
        grid: { color: "#f3f4f6" },
        border: { display: false },
        ticks: {
          color: "#9ca3af",
          font: { size: 10 },
          callback: (v: any) => `${v}%`,
        },
      },
    },
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analyses</h2>
          <p className="text-sm text-gray-500 mt-1">
            Insights détaillés sur les performances pédagogiques
          </p>
        </div>
        <span className="rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">
          Mise à jour : {new Date().toLocaleDateString("fr-FR")}
        </span>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Success Rate Trend */}
        <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Taux de Réussite - Évolution
          </h3>
          <p className="text-xs text-gray-500 mb-4">Tendance hebdomadaire</p>
          <div className="h-64">
            <Line data={successTrendData} options={lineOptions} />
          </div>
        </div>

        {/* 2. Dropout Rate Trend */}
        <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Taux d'Abandon - Évolution
          </h3>
          <p className="text-xs text-gray-500 mb-4">Tendance hebdomadaire</p>
          <div className="h-64">
            <Line data={dropoutTrendData} options={lineOptions} />
          </div>
        </div>

        {/* 3. Success by Formation */}
        <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Réussite par Formation
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Comparaison des formations
          </p>
          <div className="h-64">
            <Bar data={formationSuccessData} options={barOptions} />
          </div>
        </div>

        {/* 4. Promotion Comparison */}
        <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Comparaison par Promotion
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Réussite, Abandon, Satisfaction
          </p>
          <div className="h-64">
            <Bar data={promotionComparisonData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Overall Success Rate */}
        <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Réussite Globale
          </p>
          <p className="text-3xl font-bold text-green-900 mt-1">
            {(
              trendData.reduce((sum, d) => sum + d.reussite, 0) /
              trendData.length
            ).toFixed(1)}
            %
          </p>
          <p className="text-xs text-gray-600 mt-1">Moyenne sur la période</p>
        </div>

        {/* Overall Dropout Rate */}
        <div className="rounded-xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Abandon Global
          </p>
          <p className="text-3xl font-bold text-red-900 mt-1">
            {(
              trendData.reduce((sum, d) => sum + d.abandon, 0) /
              trendData.length
            ).toFixed(1)}
            %
          </p>
          <p className="text-xs text-gray-600 mt-1">Moyenne sur la période</p>
        </div>

        {/* Best Performing Formation */}
        <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Meilleure Formation
          </p>
          <p className="text-2xl font-bold text-amber-900 mt-1">
            {
              formationData.reduce((best, f) =>
                f.tauxReussite > best.tauxReussite ? f : best,
              ).formation
            }
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {
              formationData.reduce((best, f) =>
                f.tauxReussite > best.tauxReussite ? f : best,
              ).tauxReussite
            }
            % de réussite
          </p>
        </div>
      </div>
    </div>
  );
}
