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
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Radar, Line, Bar } from "react-chartjs-2";

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

type FormateurPerf = {
  id: string;
  nom: string;
  specialite: string;
  scoreEfficacite: number;
  tauxReussite: number;
  satisfaction: number;
  sessionsAnimées: number;
  totalApprenants: number;
};

type FormateurTrend = {
  nom: string;
  data: { date: string; score: number }[];
};

// ─── Données Statiques de secours ─────────────────────────────────────────────

const staticFormateurs: FormateurPerf[] = [
  {
    id: "1",
    nom: "Marie Dupont",
    specialite: "Data Science",
    scoreEfficacite: 94,
    tauxReussite: 91,
    satisfaction: 4.8,
    sessionsAnimées: 48,
    totalApprenants: 256,
  },
  {
    id: "2",
    nom: "Jean Martin",
    specialite: "Développement Web",
    scoreEfficacite: 91,
    tauxReussite: 87,
    satisfaction: 4.6,
    sessionsAnimées: 36,
    totalApprenants: 189,
  },
  {
    id: "3",
    nom: "Sophie Laurent",
    specialite: "Design UX/UI",
    scoreEfficacite: 88,
    tauxReussite: 84,
    satisfaction: 4.5,
    sessionsAnimées: 42,
    totalApprenants: 223,
  },
  {
    id: "4",
    nom: "Pierre Moreau",
    specialite: "Cloud & DevOps",
    scoreEfficacite: 85,
    tauxReussite: 78,
    satisfaction: 4.3,
    sessionsAnimées: 30,
    totalApprenants: 159,
  },
  {
    id: "5",
    nom: "Claire Bernard",
    specialite: "Cybersécurité",
    scoreEfficacite: 82,
    tauxReussite: 72,
    satisfaction: 4.1,
    sessionsAnimées: 25,
    totalApprenants: 134,
  },
];

const staticTrends: FormateurTrend[] = [
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

// ─── Composants de présentation ───────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-4 bg-green-50 rounded w-40 mb-4" />
      <div className="h-64 bg-green-50 rounded" />
    </div>
  );
}

// ─── Composant Principal ───────────────────────────────────────────────────────

export default function ChartsSection({ filters }: { filters: FilterOptions }) {
  const [loading, setLoading] = useState(true);
  const [formateurs, setFormateurs] =
    useState<FormateurPerf[]>(staticFormateurs);
  const [trends, setTrends] = useState<FormateurTrend[]>(staticTrends);

  // ── Récupération des données ────────────────────────────────────────────────
  useEffect(() => {
    const fetchFormateurs = async () => {
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
          `${base}/dashboard/pedagogique/formateurs${queryPart}`,
          { headers },
        );

        if (res.ok) {
          const data = await res.json();
          setFormateurs(data.formateurs || staticFormateurs);
          setTrends(data.trends || staticTrends);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFormateurs();
  }, [filters]);

  // ─── LOGIQUE DE CALCUL DES GRAPHIQUES ───────────────────────────────────────

  /**
   * 1. Graphique Radar : Comparaison Multidimensionnelle
   * Permet de comparer les formateurs sur plusieurs axes.
   * CALCULS :
   * - Efficacité & Réussite : Valeurs directes (0-100).
   * - Satisfaction : La note sur 5 est multipliée par 20 pour être ramenée sur 100.
   * - Sessions : Normalisées. On considère que 50 sessions = 100% (score max).
   * - Engagement : Basé sur le nombre d'apprenants. 300 apprenants = 100% (score max).
   */
  const radarData = {
    labels: [
      "Efficacité",
      "Réussite",
      "Satisfaction",
      "Sessions",
      "Engagement",
    ],
    datasets: formateurs.slice(0, 4).map((f, i) => ({
      label: f.nom,
      data: [
        f.scoreEfficacite,
        f.tauxReussite,
        f.satisfaction * 20, // Échelle 0-100
        Math.min((f.sessionsAnimées / 50) * 100, 100), // Normalisation (base 50)
        Math.min((f.totalApprenants / 300) * 100, 100), // Normalisation (base 300)
      ],
      borderColor: ["#16a34a", "#2563eb", "#d97706", "#7c3aed"][i],
      backgroundColor: [
        "rgba(22,163,74,0.15)",
        "rgba(37,99,235,0.15)",
        "rgba(217,119,6,0.15)",
        "rgba(124,58,237,0.15)",
      ][i],
      pointBackgroundColor: ["#16a34a", "#2563eb", "#d97706", "#7c3aed"][i],
      pointRadius: 4,
    })),
  };

  /**
   * 2. Graphique Linéaire : Évolution de Performance
   * Affiche la tendance des scores au fil du temps (semaines).
   */
  const lineData = {
    labels: trends[0]?.data.map((d) => d.date) || [],
    datasets: trends.map((t, i) => ({
      label: t.nom,
      data: t.data.map((d) => d.score),
      borderColor: ["#16a34a", "#2563eb", "#d97706"][i],
      backgroundColor: [
        "rgba(22,163,74,0.1)",
        "rgba(37,99,235,0.1)",
        "rgba(217,119,6,0.1)",
      ][i],
      tension: 0.4,
      fill: true,
      pointBackgroundColor: ["#16a34a", "#2563eb", "#d97706"][i],
      pointRadius: 4,
      pointHoverRadius: 6,
    })),
  };

  /**
   * 3. Graphique en Barres : Classement Efficacité
   * Simple comparaison visuelle des scores d'efficacité (0-100).
   */
  const barData = {
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
  };

  // ── Options communes des graphiques ─────────────────────────────────────────
  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { font: { size: 10 }, boxWidth: 10, padding: 12 },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: 10,
      },
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: { font: { size: 9 }, callback: (v: any) => `${v}` },
        grid: { color: "#f3f4f6" },
        pointLabels: { font: { size: 10 }, color: "#6b7280" },
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
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: 10,
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${context.raw}`,
        },
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

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "x" as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: 10,
        callbacks: {
          label: (context: any) => ` ${context.raw}/100`,
        },
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
        ticks: {
          color: "#9ca3af",
          font: { size: 9 },
          callback: (v: any) => `${v}`,
        },
      },
    },
  };

  // ── Rendu ───────────────────────────────────────────────────────────────────

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

      {/* Cartes KPI - Calcul des moyennes globales */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Moyenne d'efficacité : Somme des scores / Nombre de formateurs */}
        <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Efficacité Moyenne
          </p>
          <p className="text-3xl font-bold text-green-900 mt-1">
            {(
              formateurs.reduce((sum, f) => sum + f.scoreEfficacite, 0) /
              formateurs.length
            ).toFixed(1)}
          </p>
          <p className="text-xs text-gray-600 mt-1">/100</p>
        </div>

        {/* Moyenne de satisfaction : Somme des notes / Nombre de formateurs */}
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Satisfaction Moyenne
          </p>
          <p className="text-3xl font-bold text-blue-900 mt-1">
            {(
              formateurs.reduce((sum, f) => sum + f.satisfaction, 0) /
              formateurs.length
            ).toFixed(1)}
          </p>
          <p className="text-xs text-gray-600 mt-1">/5.0</p>
        </div>

        {/* Total apprenants : Somme cumulée de tous les apprenants formés */}
        <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Total Apprenants
          </p>
          <p className="text-3xl font-bold text-amber-900 mt-1">
            {formateurs.reduce((sum, f) => sum + f.totalApprenants, 0)}
          </p>
          <p className="text-xs text-gray-600 mt-1">en charge</p>
        </div>
      </div>

      {/* Grille des Graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Graphique Radar */}
        <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Comparaison Multidimensionnelle
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Top 4 formateurs par efficacité
          </p>
          <div className="h-72">
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>

        {/* Graphique en Barres */}
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

      {/* Graphique Linéaire (Pleine largeur) */}
      <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          Évolution de Performance
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Tendance semaine par semaine
        </p>
        <div className="h-72">
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>
    </div>
  );
}
