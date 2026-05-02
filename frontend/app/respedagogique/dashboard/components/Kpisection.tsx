"use client";

import type { FilterOptions } from "@/context/FilterContext";
import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut, Radar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
);

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Represents a main KPI card displayed at the top of the dashboard.
 */
type KPIItem = {
  title: string;
  value: string;
  trend: "up" | "down" | "stable";
  delta: string;
  icon: string;
  color: string;
};

/**
 * Performance metrics for an individual trainer.
 */
type FormateurPerf = {
  nom: string;
  initiales: string;
  specialite: string;
  sessions: number;
  scoreEfficacite: number;
  tauxReussite: number;
  satisfaction: number;
};

/**
 * Record for a specific training program used in the summary table.
 */
type FormationRecord = {
  formation: string;
  formateur: string;
  inscrits: number;
  tauxReussite: number;
  tauxAbandon: number;
  tauxCompletion: number;
  satisfaction: number;
  statut: "Actif" | "Terminé" | "Annulé";
  type: "En ligne" | "Présentiel";
};

/**
 * Represents a learner identified as being at risk of dropping out.
 */
type ApprenantRisque = {
  nom: string;
  formation: string;
  raison: string;
  progression: number;
};

// ─── Static fallback data (replaced by API) ───────────────────────────────────

const staticFormations: FormationRecord[] = [
  {
    formation: "Data Science Avancée",
    formateur: "Marie D.",
    inscrits: 32,
    tauxReussite: 91,
    tauxAbandon: 3,
    tauxCompletion: 88,
    satisfaction: 4.8,
    statut: "Actif",
    type: "En ligne",
  },
  {
    formation: "Développement Full-Stack",
    formateur: "Jean M.",
    inscrits: 45,
    tauxReussite: 87,
    tauxAbandon: 5,
    tauxCompletion: 82,
    satisfaction: 4.6,
    statut: "Actif",
    type: "En ligne",
  },
  {
    formation: "UX/UI Design",
    formateur: "Sophie L.",
    inscrits: 28,
    tauxReussite: 84,
    tauxAbandon: 4,
    tauxCompletion: 79,
    satisfaction: 4.5,
    statut: "Actif",
    type: "Présentiel",
  },
  {
    formation: "Cloud & DevOps",
    formateur: "Pierre M.",
    inscrits: 38,
    tauxReussite: 78,
    tauxAbandon: 8,
    tauxCompletion: 71,
    satisfaction: 4.3,
    statut: "Actif",
    type: "Présentiel",
  },
  {
    formation: "Intelligence Artificielle",
    formateur: "Marie D.",
    inscrits: 22,
    tauxReussite: 95,
    tauxAbandon: 2,
    tauxCompletion: 93,
    satisfaction: 4.9,
    statut: "Actif",
    type: "En ligne",
  },
  {
    formation: "Cybersécurité",
    formateur: "Claire B.",
    inscrits: 18,
    tauxReussite: 72,
    tauxAbandon: 10,
    tauxCompletion: 65,
    satisfaction: 4.1,
    statut: "Terminé",
    type: "Présentiel",
  },
];

const staticFormateurs: FormateurPerf[] = [
  {
    nom: "Marie Dupont",
    initiales: "MD",
    specialite: "Data Science",
    sessions: 48,
    scoreEfficacite: 94,
    tauxReussite: 91,
    satisfaction: 4.8,
  },
  {
    nom: "Jean Martin",
    initiales: "JM",
    specialite: "Dev Web",
    sessions: 36,
    scoreEfficacite: 91,
    tauxReussite: 87,
    satisfaction: 4.6,
  },
  {
    nom: "Sophie Laurent",
    initiales: "SL",
    specialite: "UX Design",
    sessions: 42,
    scoreEfficacite: 88,
    tauxReussite: 84,
    satisfaction: 4.5,
  },
  {
    nom: "Pierre Moreau",
    initiales: "PM",
    specialite: "Cloud",
    sessions: 30,
    scoreEfficacite: 85,
    tauxReussite: 78,
    satisfaction: 4.3,
  },
  {
    nom: "Claire Bernard",
    initiales: "CB",
    specialite: "Cybersécurité",
    sessions: 25,
    scoreEfficacite: 82,
    tauxReussite: 72,
    satisfaction: 4.1,
  },
];

const staticRisque: ApprenantRisque[] = [
  {
    nom: "Lucas Petit",
    formation: "Cloud & DevOps",
    raison: "Absences répétées",
    progression: 42,
  },
  {
    nom: "Emma Richard",
    formation: "Cybersécurité",
    raison: "Notes en baisse",
    progression: 55,
  },
  {
    nom: "Hugo Thomas",
    formation: "Dev Full-Stack",
    raison: "3 évals manquées",
    progression: 38,
  },
  {
    nom: "Léa Robert",
    formation: "Data Science",
    raison: "Retards fréquents",
    progression: 61,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getReussiteColor(val: number) {
  if (val >= 90) return { text: "text-green-700", bg: "bg-green-100" };
  if (val >= 80) return { text: "text-green-600", bg: "bg-green-50" };
  if (val >= 70) return { text: "text-amber-600", bg: "bg-amber-50" };
  return { text: "text-red-600", bg: "bg-red-50" };
}

function getAbandonColor(val: number) {
  if (val <= 3) return { text: "text-green-700", bg: "bg-green-100" };
  if (val <= 6) return { text: "text-amber-600", bg: "bg-amber-50" };
  return { text: "text-red-600", bg: "bg-red-50" };
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-3 h-3 ${i <= Math.round(value) ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-600">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function MiniProgressBar({
  value,
  color = "bg-green-500",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KPISection({ filters }: { filters: FilterOptions }) {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIItem[]>([]);
  const [formateurs, setFormateurs] =
    useState<FormateurPerf[]>(staticFormateurs);
  const [formations, setFormations] =
    useState<FormationRecord[]>(staticFormations);
  const [risque, setRisque] = useState<ApprenantRisque[]>(staticRisque);
  const [tauxCompletion, setTauxCompletion] = useState(73);

  // table state
  const [sortBy, setSortBy] = useState<keyof FormationRecord>("tauxReussite");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // ── Fetch from backend ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
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
        if (filters.type && filters.type !== "Tous")
          params.append("type", filters.type);
        if (filters.statut && filters.statut !== "Tous")
          params.append("statut", filters.statut);

        const queryString = params.toString();
        const queryPart = queryString ? `?${queryString}` : "";

        // ── Parallel Data Fetching ──────────────────────────────────────────
        const [kpiRes, fmtRes, fmationRes, risqueRes] =
          await Promise.allSettled([
            fetch(`${base}/responsable/dashboard/kpis${queryPart}`, {
              headers,
            }),
            fetch(`${base}/responsable/formateurs/performances${queryPart}`, {
              headers,
            }),
            fetch(`${base}/responsable/formations/taux-reussite${queryPart}`, {
              headers,
            }),
            fetch(`${base}/responsable/apprenants/risque${queryPart}`, {
              headers,
            }),
          ]);

        // ── Main KPI Processing ─────────────────────────────────────────────
        if (kpiRes.status === "fulfilled" && kpiRes.value.ok) {
          const data = await kpiRes.value.json();
          setKpis([
            {
              title: "Taux de Réussite Global",
              value: `${data.tauxReussiteGlobal ?? 86.4}%`,
              trend: (data.evolutionReussite ?? 2.3) >= 0 ? "up" : "down",
              delta: `${(data.evolutionReussite ?? 2.3) > 0 ? "+" : ""}${data.evolutionReussite ?? 2.3}% vs mois dernier`,
              icon: "🎯",
              color: "green",
            },
            {
              title: "Taux d'Abandon",
              value: `${data.tauxAbandon ?? 4.2}%`,
              trend: (data.evolutionAbandon ?? -0.8) <= 0 ? "up" : "down",
              delta: `${data.evolutionAbandon ?? -0.8}% vs mois dernier`,
              icon: "📉",
              color: "amber",
            },
            {
              title: "Satisfaction Moyenne",
              value: `${data.satisfactionMoyenne ?? 4.6}/5`,
              trend: (data.evolutionSatisfaction ?? 0.3) >= 0 ? "up" : "stable",
              delta: `+${data.evolutionSatisfaction ?? 0.3} vs trimestre`,
              icon: "⭐",
              color: "green",
            },
            {
              title: "Formations Actives",
              value: `${data.formationsActives ?? 12}`,
              trend: "stable",
              delta: `+${data.nouvellesFormations ?? 2} ce mois`,
              icon: "📚",
              color: "green",
            },
          ]);
          setTauxCompletion(data.tauxCompletion ?? 73);
        } else {
          // fallback KPIs
          setKpis([
            {
              title: "Taux de Réussite Global",
              value: "86.4%",
              trend: "up",
              delta: "+2.3% vs mois dernier",
              icon: "🎯",
              color: "green",
            },
            {
              title: "Taux d'Abandon",
              value: "4.2%",
              trend: "up",
              delta: "-0.8% vs mois dernier",
              icon: "📉",
              color: "amber",
            },
            {
              title: "Satisfaction Moyenne",
              value: "4.6/5",
              trend: "up",
              delta: "+0.3 vs trimestre",
              icon: "⭐",
              color: "green",
            },
            {
              title: "Formations Actives",
              value: "12",
              trend: "stable",
              delta: "+2 ce mois",
              icon: "📚",
              color: "green",
            },
          ]);
        }

        // Formateurs
        if (fmtRes.status === "fulfilled" && fmtRes.value.ok) {
          const data = await fmtRes.value.json();
          setFormateurs(data);
        }

        // Formations
        if (fmationRes.status === "fulfilled" && fmationRes.value.ok) {
          const data = await fmationRes.value.json();
          setFormations(data);
        }

        // Apprenants à risque
        if (risqueRes.status === "fulfilled" && risqueRes.value.ok) {
          const data = await risqueRes.value.json();
          setRisque(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [filters]);

  // ── Table filtering + sorting logic ─────────────────────────────────────────
  const filteredFormations = useMemo(() => {
    let rows = [...formations];
    if (filters.formation && filters.formation !== "Tous")
      rows = rows.filter((r) => r.formation === filters.formation);
    if (filters.formateur && filters.formateur !== "Tous")
      rows = rows.filter((r) => r.formateur === filters.formateur);
    if (filters.statut && filters.statut !== "Tous")
      rows = rows.filter((r) => r.statut === filters.statut);
    if (filters.type && filters.type !== "Tous")
      rows = rows.filter((r) => r.type === filters.type);

    rows.sort((a, b) => {
      const av = a[sortBy],
        bv = b[sortBy];
      if (typeof av === "number" && typeof bv === "number")
        return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [filters, sortBy, sortDir, formations]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFormations.length / pageSize),
  );
  const pagedFormations = filteredFormations.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const handleSort = (field: keyof FormationRecord) => {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  // ── Chart Data Preparation ────────────────────────────────────────────────
  const barFormateurData = {
    labels: formateurs.map((f) => f.initiales),
    datasets: [
      {
        label: "Score efficacité",
        data: formateurs.map((f) => f.scoreEfficacite),
        backgroundColor: [
          "#166534cc",
          "#15803dcc",
          "#16a34acc",
          "#22c55ecc",
          "#4ade80cc",
        ],
        borderColor: ["#14532d", "#166534", "#15803d", "#16a34a", "#22c55e"],
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const lineReussiteData = {
    labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun"],
    datasets: [
      {
        label: "Taux de réussite %",
        data: [82, 84, 83, 86, 85, 86.4],
        borderColor: "#16a34a",
        backgroundColor: "rgba(22,163,74,0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#16a34a",
        pointRadius: 4,
      },
      {
        label: "Taux d'abandon %",
        data: [6.1, 5.8, 5.2, 4.9, 4.5, 4.2],
        borderColor: "#d97706",
        backgroundColor: "rgba(217,119,6,0.08)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#d97706",
        pointRadius: 4,
      },
    ],
  };

  const doughnutData = {
    datasets: [
      {
        data: [tauxCompletion, 100 - tauxCompletion],
        backgroundColor: ["#16a34a", "#f0fdf4"],
        borderWidth: 0,
        hoverOffset: 0,
      },
    ],
  };

  const radarData = {
    labels: [
      "Réussite",
      "Satisfaction",
      "Complétion",
      "Ponctualité",
      "Pédagogie",
    ],
    datasets: formateurs.slice(0, 3).map((f, i) => ({
      label: f.initiales,
      data: [
        f.tauxReussite,
        f.satisfaction * 20,
        f.scoreEfficacite,
        80 + i * 3,
        85 + i * 2,
      ],
      borderColor: ["#16a34a", "#d97706", "#2563eb"][i],
      backgroundColor: [
        "rgba(22,163,74,0.15)",
        "rgba(217,119,6,0.15)",
        "rgba(37,99,235,0.15)",
      ][i],
      pointBackgroundColor: ["#16a34a", "#d97706", "#2563eb"][i],
      pointRadius: 3,
    })),
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="p-4 md:p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm animate-pulse"
            >
              <div className="h-4 bg-green-50 rounded w-2/3 mb-3" />
              <div className="h-8 bg-green-50 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm animate-pulse h-52"
            />
          ))}
        </div>
      </main>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="p-4 md:p-6 space-y-6">
      {/* ── Section titre ── */}
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">
          Mise à jour : {new Date().toLocaleDateString("fr-FR")}
        </span>
      </div>

      {/* ══ 1. KPI CARDS ══════════════════════════════════════════════════════ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-green-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-2xl">{item.icon}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold flex items-center gap-1
                  ${item.trend === "up" ? "bg-green-50 text-green-700" : item.trend === "down" ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"}`}
              >
                {item.trend === "up" ? "↑" : item.trend === "down" ? "↓" : "→"}{" "}
                {item.delta}
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              {item.title}
            </p>
            <p className="text-2xl font-bold text-green-900 mt-0.5">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* ══ 2. CHARTS ROW ═════════════════════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bar — Performance formateurs */}
        <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-green-900 mb-1">
            Performance Formateurs
          </h4>
          <p className="text-xs text-gray-400 mb-3">
            Score d'efficacité pédagogique
          </p>
          <div className="h-44">
            <Bar
              data={barFormateurData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (c) => ` ${c.raw}%` } },
                },
                scales: {
                  x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: "#9ca3af", font: { size: 11 } },
                  },
                  y: {
                    min: 60,
                    max: 100,
                    grid: { color: "#f3f4f6" },
                    border: { display: false },
                    ticks: {
                      color: "#9ca3af",
                      font: { size: 10 },
                      callback: (v) => `${v}%`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Line — Évolution réussite / abandon */}
        <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-green-900 mb-1">
            Évolution Réussite / Abandon
          </h4>
          <p className="text-xs text-gray-400 mb-3">Tendance sur 6 mois</p>
          <div className="h-44">
            <Line
              data={lineReussiteData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: { font: { size: 10 }, boxWidth: 10, padding: 8 },
                  },
                  tooltip: {
                    callbacks: {
                      label: (c) => ` ${c.dataset.label}: ${c.raw}%`,
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
                      callback: (v) => `${v}%`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Doughnut — Taux de complétion */}
        <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm flex flex-col items-center justify-center">
          <h4 className="text-sm font-semibold text-green-900 mb-1 self-start">
            Taux de Complétion
          </h4>
          <p className="text-xs text-gray-400 mb-3 self-start">
            Global toutes formations
          </p>
          <div className="relative w-36 h-36">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: "78%",
                plugins: {
                  legend: { display: false },
                  tooltip: { enabled: false },
                },
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-green-900">
                {tauxCompletion}%
              </span>
              <span className="text-[10px] text-gray-400">complété</span>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-green-600 inline-block" />
              Complété
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-green-50 border border-green-200 inline-block" />
              Restant
            </span>
          </div>
        </div>
      </div>

      {/* ══ 3. PERFORMANCE FORMATEURS (liste + radar) ═════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Liste formateurs — col-span-3 */}
        <div className="lg:col-span-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-green-900 mb-1">
            Classement Formateurs
          </h4>
          <p className="text-xs text-gray-400 mb-4">
            Par score d'efficacité pédagogique
          </p>
          <div className="space-y-3">
            {formateurs
              .sort((a, b) => b.scoreEfficacite - a.scoreEfficacite)
              .map((f, i) => (
                <div
                  key={f.nom}
                  className="flex items-center gap-3 group hover:bg-green-50 rounded-lg px-2 py-1.5 transition-colors cursor-pointer"
                >
                  {/* Rank */}
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
                    ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : "bg-green-50 text-green-700"}`}
                  >
                    {i + 1}
                  </span>
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-xs font-bold text-green-800 flex-shrink-0">
                    {f.initiales}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-800 truncate">
                        {f.nom}
                      </span>
                      <span className="text-xs font-bold text-green-700 ml-2 flex-shrink-0">
                        {f.scoreEfficacite}%
                      </span>
                    </div>
                    <MiniProgressBar value={f.scoreEfficacite} />
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-gray-400">
                        {f.specialite}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {f.sessions} sessions
                      </span>
                      <StarRating value={f.satisfaction} />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Radar — col-span-2 */}
        <div className="lg:col-span-2 rounded-xl border border-green-100 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-green-900 mb-1">
            Analyse Comparative
          </h4>
          <p className="text-xs text-gray-400 mb-3">Top 3 formateurs</p>
          <div className="h-52">
            <Radar
              data={radarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: { font: { size: 10 }, boxWidth: 10 },
                  },
                },
                scales: {
                  r: {
                    min: 60,
                    max: 100,
                    ticks: { display: false },
                    grid: { color: "#f0fdf4" },
                    pointLabels: { font: { size: 10 }, color: "#6b7280" },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* ══ 4. TABLE FORMATIONS ═══════════════════════════════════════════════ */}
      <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-green-900">
              Taux de Réussite par Formation
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredFormations.length} formation
              {filteredFormations.length > 1 ? "s" : ""} · Cliquer sur un
              en-tête pour trier
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Tri :</span>
            <span className="font-semibold text-green-800">
              {sortBy} {sortDir === "asc" ? "↑" : "↓"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-green-50 text-xs uppercase text-gray-500">
              <tr>
                {[
                  { label: "Formation", key: "formation" },
                  { label: "Formateur", key: "formateur" },
                  { label: "Inscrits", key: "inscrits" },
                  { label: "Réussite", key: "tauxReussite" },
                  { label: "Abandon", key: "tauxAbandon" },
                  { label: "Complétion", key: "tauxCompletion" },
                  { label: "Satisfaction", key: "satisfaction" },
                  { label: "Statut", key: "statut" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2.5 cursor-pointer hover:bg-green-100 transition-colors select-none whitespace-nowrap"
                    onClick={() => handleSort(col.key as keyof FormationRecord)}
                  >
                    {col.label}{" "}
                    {sortBy === col.key ? (
                      sortDir === "asc" ? (
                        "↑"
                      ) : (
                        "↓"
                      )
                    ) : (
                      <span className="text-gray-300">↕</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pagedFormations.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-gray-400 text-sm"
                  >
                    Aucune formation ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                pagedFormations.map((row, idx) => {
                  const rc = getReussiteColor(row.tauxReussite);
                  const ac = getAbandonColor(row.tauxAbandon);
                  return (
                    <tr
                      key={`${row.formation}-${idx}`}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">
                        {row.formation}
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        {row.formateur}
                      </td>
                      <td className="px-3 py-3 text-gray-700 text-center">
                        {row.inscrits}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${rc.bg} ${rc.text}`}
                          >
                            {row.tauxReussite}%
                          </span>
                          <div className="w-16 hidden sm:block">
                            <MiniProgressBar
                              value={row.tauxReussite}
                              color={
                                row.tauxReussite >= 80
                                  ? "bg-green-500"
                                  : "bg-amber-400"
                              }
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${ac.bg} ${ac.text}`}
                        >
                          {row.tauxAbandon}%
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16">
                            <MiniProgressBar
                              value={row.tauxCompletion}
                              color="bg-blue-400"
                            />
                          </div>
                          <span className="text-xs text-gray-600">
                            {row.tauxCompletion}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StarRating value={row.satisfaction} />
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                          ${row.statut === "Actif" ? "bg-green-50 text-green-700" : row.statut === "Terminé" ? "bg-gray-100 text-gray-600" : "bg-red-50 text-red-600"}`}
                        >
                          {row.statut}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>
            {filteredFormations.length} résultat
            {filteredFormations.length > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-green-200 px-3 py-1.5 hover:bg-green-50 disabled:opacity-40 transition-colors"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ← Précédent
            </button>
            <span className="font-semibold text-green-800">
              {page} / {totalPages}
            </span>
            <button
              className="rounded-md border border-green-200 px-3 py-1.5 hover:bg-green-50 disabled:opacity-40 transition-colors"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Suivant →
            </button>
          </div>
        </div>
      </div>

      {/* ══ 5. APPRENANTS À RISQUE ════════════════════════════════════════════ */}
      <div className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⚠️</span>
          <div>
            <h4 className="text-sm font-semibold text-amber-800">
              Apprenants à Risque
            </h4>
            <p className="text-xs text-gray-400">
              {risque.length} apprenant{risque.length > 1 ? "s" : ""}{" "}
              nécessitent une intervention
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {risque.map((a) => (
            <div
              key={a.nom}
              className="rounded-lg border border-amber-100 bg-amber-50 p-3 hover:border-amber-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-xs font-bold text-amber-800 flex-shrink-0">
                  {a.nom
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {a.nom}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {a.formation}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                  ⚡ {a.raison}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>Progression</span>
                  <span className="font-semibold">{a.progression}%</span>
                </div>
                <MiniProgressBar
                  value={a.progression}
                  color={a.progression >= 60 ? "bg-amber-400" : "bg-red-400"}
                />
              </div>
            </div>
          ))}
        </div>
        <button className="mt-4 w-full rounded-lg border border-amber-200 bg-amber-50 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors">
          Voir tous les apprenants à risque →
        </button>
      </div>
    </main>
  );
}
