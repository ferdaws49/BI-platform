"use client";

import type { FilterOptions } from "@/context/FilterContext";
import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Pie, Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

type StudentStatus = {
  status: "Actif" | "Terminé" | "Annulé";
  count: number;
};

type ScoreEvolution = {
  date: string;
  score: number;
};

type FormationSuccessRate = {
  formation: string;
  tauxReussite: number;
};

// ─── Static Fallback Data ─────────────────────────────────────────────────────

const staticStudentStatus: StudentStatus[] = [
  { status: "Actif", count: 187 },
  { status: "Terminé", count: 142 },
  { status: "Annulé", count: 21 },
];

const staticScoreEvolution: ScoreEvolution[] = [
  { date: "Sem 1", score: 65 },
  { date: "Sem 2", score: 68 },
  { date: "Sem 3", score: 72 },
  { date: "Sem 4", score: 75 },
  { date: "Sem 5", score: 78 },
  { date: "Sem 6", score: 81 },
];

const staticFormationSucces: FormationSuccessRate[] = [
  { formation: "Data Science", tauxReussite: 91 },
  { formation: "Full-Stack", tauxReussite: 87 },
  { formation: "UX/UI", tauxReussite: 84 },
  { formation: "Cloud", tauxReussite: 78 },
  { formation: "IA", tauxReussite: 95 },
  { formation: "Cybersécurité", tauxReussite: 72 },
];

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-4 bg-blue-50 rounded w-40 mb-4" />
      <div className="h-64 bg-blue-50 rounded" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChartsSection({ filters }: { filters: FilterOptions }) {
  const [loading, setLoading] = useState(true);
  const [studentStatus, setStudentStatus] =
    useState<StudentStatus[]>(staticStudentStatus);
  const [scoreEvolution, setScoreEvolution] =
    useState<ScoreEvolution[]>(staticScoreEvolution);
  const [formationSuccess, setFormationSuccess] = useState<
    FormationSuccessRate[]
  >(staticFormationSucces);

  // ── Fetch from backend ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchApprenants = async () => {
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
        if (filters.statut && filters.statut !== "Tous")
          params.append("statut", filters.statut);

        const queryString = params.toString();
        const queryPart = queryString ? `?${queryString}` : "";

        const res = await fetch(
          `${base}/dashboard/pedagogique/apprenants${queryPart}`,
          { headers },
        );

        if (res.ok) {
          const data = await res.json();
          setStudentStatus(data.studentStatus || staticStudentStatus);
          setScoreEvolution(data.scoreEvolution || staticScoreEvolution);
          setFormationSuccess(data.formationSuccess || staticFormationSucces);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApprenants();
  }, [filters]);

  // ── Chart Data ──────────────────────────────────────────────────────────────

  // 1. Pie Chart: Students by Status
  const totalStudents = studentStatus.reduce((sum, s) => sum + s.count, 0);
  const pieData = {
    labels: studentStatus.map((s) => s.status),
    datasets: [
      {
        data: studentStatus.map((s) => s.count),
        backgroundColor: ["#3b82f6", "#10b981", "#ef4444"],
        borderColor: ["#1e40af", "#047857", "#dc2626"],
        borderWidth: 2,
        hoverOffset: 10,
      },
    ],
  };

  // 2. Line Chart: Average Score Evolution
  const lineData = {
    labels: scoreEvolution.map((s) => s.date),
    datasets: [
      {
        label: "Score Moyen",
        data: scoreEvolution.map((s) => s.score),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#6366f1",
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  // 3. Bar Chart: Success by formation
  const barData = {
    labels: formationSuccess.map((f) => f.formation),
    datasets: [
      {
        label: "Taux de Réussite %",
        data: formationSuccess.map((f) => f.tauxReussite),
        backgroundColor: [
          "#3b82f6cc",
          "#06b6d4cc",
          "#8b5cf6cc",
          "#ec4899cc",
          "#f59e0bcc",
          "#ef4444cc",
        ],
        borderColor: [
          "#1e40af",
          "#0891b2",
          "#6d28d9",
          "#be185d",
          "#d97706",
          "#dc2626",
        ],
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  // ── Common chart options ────────────────────────────────────────────────────
  const pieOptions = {
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
        callbacks: {
          label: (context: any) =>
            ` ${context.label}: ${context.raw} apprenants`,
        },
      },
    },
  };

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
        callbacks: {
          label: (context: any) => ` Score: ${context.raw}/100`,
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
        min: 0,
        max: 100,
        grid: { color: "#f3f4f6" },
        border: { display: false },
        ticks: {
          color: "#9ca3af",
          font: { size: 10 },
          callback: (v: any) => `${v}`,
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: 12,
        callbacks: {
          label: (context: any) => ` ${context.raw}%`,
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
        min: 0,
        max: 100,
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
      <div className="grid gap-6 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
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
          <h2 className="text-2xl font-bold text-gray-900">Apprenants</h2>
          <p className="text-sm text-gray-500 mt-1">
            Suivi de la progression et du statut des apprenants
          </p>
        </div>
        <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-800">
          Total: {totalStudents} apprenants
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Actifs</p>
          <p className="text-3xl font-bold text-blue-900 mt-1">
            {studentStatus.find((s) => s.status === "Actif")?.count || 0}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {(
              ((studentStatus.find((s) => s.status === "Actif")?.count || 0) /
                totalStudents) *
              100
            ).toFixed(1)}
            % en cours
          </p>
        </div>

        <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Terminés
          </p>
          <p className="text-3xl font-bold text-green-900 mt-1">
            {studentStatus.find((s) => s.status === "Terminé")?.count || 0}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {(
              ((studentStatus.find((s) => s.status === "Terminé")?.count || 0) /
                totalStudents) *
              100
            ).toFixed(1)}
            % complétés
          </p>
        </div>

        <div className="rounded-xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Annulés</p>
          <p className="text-3xl font-bold text-red-900 mt-1">
            {studentStatus.find((s) => s.status === "Annulé")?.count || 0}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {(
              ((studentStatus.find((s) => s.status === "Annulé")?.count || 0) /
                totalStudents) *
              100
            ).toFixed(1)}
            % abandonnés
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pie Chart */}
        <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Distribution par Statut
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Répartition des apprenants
          </p>
          <div className="h-64">
            <Pie data={pieData} options={pieOptions} />
          </div>
        </div>

        {/* Line Chart */}
        <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Progression Moyenne
          </h3>
          <p className="text-xs text-gray-500 mb-4">Évolution des scores</p>
          <div className="h-64">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        {/* Bar Chart */}
        <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Réussite par Formation
          </h3>
          <p className="text-xs text-gray-500 mb-4">Taux de réussite moyen</p>
          <div className="h-64">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
