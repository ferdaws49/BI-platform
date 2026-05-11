"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Radar, Line, Bar } from "react-chartjs-2";
import type { FormateurPerf } from "../page";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
);

const staticTrends = [
  {
    nom: "Marie Dupont",
    data: [
      { date: "Sem 1", score: 90 },
      { date: "Sem 2", score: 92 },
      { date: "Sem 3", score: 93 },
      { date: "Sem 4", score: 94 },
      { date: "Sem 5", score: 93 },
      { date: "Sem 6", score: 94 },
    ],
  },
  {
    nom: "Jean Martin",
    data: [
      { date: "Sem 1", score: 87 },
      { date: "Sem 2", score: 89 },
      { date: "Sem 3", score: 90 },
      { date: "Sem 4", score: 91 },
      { date: "Sem 5", score: 90 },
      { date: "Sem 6", score: 91 },
    ],
  },
  {
    nom: "Sophie Laurent",
    data: [
      { date: "Sem 1", score: 84 },
      { date: "Sem 2", score: 85 },
      { date: "Sem 3", score: 86 },
      { date: "Sem 4", score: 88 },
      { date: "Sem 5", score: 87 },
      { date: "Sem 6", score: 88 },
    ],
  },
];

const COLORS = ["#16a34a", "#2563eb", "#d97706", "#7c3aed"];
const COLORS_BG = [
  "rgba(22,163,74,0.15)",
  "rgba(37,99,235,0.15)",
  "rgba(217,119,6,0.15)",
  "rgba(124,58,237,0.15)",
];

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-4 bg-green-50 rounded w-40 mb-4" />
      <div className="h-64 bg-green-50 rounded" />
    </div>
  );
}

interface ChartsSectionProps {
  formateurs: FormateurPerf[];
  loading: boolean;
}

export default function ChartsSection({
  formateurs,
  loading,
}: ChartsSectionProps) {
  // satisfaction null = aucun avis → on retire cet axe du radar
  const hasSatisfactionData = formateurs.some(
    (f) => f.radarScores.satisfaction !== null,
  );

  // ── Radar : utilise radarScores directement — zéro calcul ici ─────────────
  const radarData = useMemo(() => {
    const labels = hasSatisfactionData
      ? ["Efficacité", "Réussite", "Satisfaction", "Activité", "Engagement"]
      : ["Efficacité", "Réussite", "Activité", "Engagement"];

    return {
      labels,
      datasets: formateurs.slice(0, 4).map((f, i) => ({
        label: f.nom,
        data: hasSatisfactionData
          ? [
              f.radarScores.efficacite,
              f.radarScores.reussite,
              f.radarScores.satisfaction ?? 0,
              f.radarScores.activite,
              f.radarScores.engagement,
            ]
          : [
              f.radarScores.efficacite,
              f.radarScores.reussite,
              f.radarScores.activite,
              f.radarScores.engagement,
            ],
        borderColor: COLORS[i],
        backgroundColor: COLORS_BG[i],
        pointBackgroundColor: COLORS[i],
        pointRadius: 4,
      })),
    };
  }, [formateurs, hasSatisfactionData]);

  // ── Bar : scoreEfficacite direct ──────────────────────────────────────────
  const barData = useMemo(
    () => ({
      labels: formateurs.map((f) => f.nom),
      datasets: [
        {
          label: "Score Efficacité",
          data: formateurs.map((f) => f.scoreEfficacite),
          backgroundColor: "#16a34acc",
          borderColor: "#166534",
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    }),
    [formateurs],
  );

  // ── Line : trends statiques jusqu'à endpoint /trends ─────────────────────
  const lineData = useMemo(
    () => ({
      labels: staticTrends[0]?.data.map((d) => d.date) || [],
      datasets: staticTrends.map((t, i) => ({
        label: t.nom,
        data: t.data.map((d) => d.score),
        borderColor: COLORS[i],
        backgroundColor: COLORS_BG[i].replace("0.15", "0.1"),
        tension: 0.4,
        fill: true,
        pointBackgroundColor: COLORS[i],
        pointRadius: 4,
        pointHoverRadius: 6,
      })),
    }),
    [],
  );

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { font: { size: 10 }, boxWidth: 10, padding: 12 },
      },
      tooltip: { backgroundColor: "rgba(0,0,0,0.8)", padding: 10 },
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: { font: { size: 9 } },
        grid: { color: "#f3f4f6" },
        pointLabels: { font: { size: 10 }, color: "#6b7280" },
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
        padding: 10,
        callbacks: { label: (ctx: { raw: unknown }) => ` ${ctx.raw}/100` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#9ca3af", font: { size: 9 } },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: "#f3f4f6" },
        border: { display: false },
        ticks: { color: "#9ca3af", font: { size: 9 } },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { font: { size: 10 }, boxWidth: 10, padding: 12 },
      },
      tooltip: { backgroundColor: "rgba(0,0,0,0.8)", padding: 10 },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#9ca3af", font: { size: 9 } },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: "#f3f4f6" },
        border: { display: false },
        ticks: { color: "#9ca3af", font: { size: 9 } },
      },
    },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-green-50 rounded w-48 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-green-100 bg-white p-4 h-24 animate-pulse"
            />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonCard />
      </div>
    );
  }

  // ── KPI cards — moyennes simples sur données reçues (agrégation UI, pas logique métier) ──
  const avgEfficacite = formateurs.length
    ? formateurs.reduce((s, f) => s + f.scoreEfficacite, 0) / formateurs.length
    : 0;

  const formateursAvecAvis = formateurs.filter((f) => f.satisfaction > 0);
  const avgSatisfaction = formateursAvecAvis.length
    ? formateursAvecAvis.reduce((s, f) => s + f.satisfaction, 0) /
      formateursAvecAvis.length
    : 0;

  // Le backend envoie déjà totalApprenants calculé comme le count unique d'apprenants
  const totalApprenantsUniques = formateurs.reduce(
    (s, f) => s + f.totalApprenants,
    0,
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Formateurs</h2>
          <p className="text-sm text-gray-500 mt-1">
            Performance et efficacité pédagogique détaillées
          </p>
        </div>
        <span className="rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">
          {formateurs.length} formateur{formateurs.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Efficacité Moyenne
          </p>
          <p className="text-3xl font-bold text-green-900 mt-1">
            {avgEfficacite.toFixed(1)}
          </p>
          <p className="text-xs text-gray-600 mt-1">/100</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Satisfaction Moyenne
          </p>
          <p className="text-3xl font-bold text-blue-900 mt-1">
            {avgSatisfaction > 0 ? avgSatisfaction.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {avgSatisfaction > 0 ? "/5.0" : "Aucun avis encore"}
          </p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Apprenants Uniques
          </p>
          <p className="text-3xl font-bold text-amber-900 mt-1">
            {totalApprenantsUniques}
          </p>
          <p className="text-xs text-gray-600 mt-1">suivant les formations</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Comparaison Multidimensionnelle
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Top 4 formateurs
            {!hasSatisfactionData && (
              <span className="ml-1 italic text-gray-400">
                (axe satisfaction masqué — aucun avis)
              </span>
            )}
          </p>
          <div className="h-72">
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>
        <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Score d'Efficacité
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Classement des formateurs
          </p>
          <div className="h-72">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          Évolution de Performance
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Tendance semaine par semaine{" "}
          <span className="italic text-gray-400">
            (démo — à connecter à /trends)
          </span>
        </p>
        <div className="h-72">
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>
    </div>
  );
}
