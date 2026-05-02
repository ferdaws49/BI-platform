"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Activity, Search, Siren, Target } from "lucide-react";
import type {
  FocusItem,
  HistoryPoint,
  InsightItem,
  TrendTone,
} from "./reportTypes";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

type InsightsSectionProps = {
  history: HistoryPoint[];
  trendInsights: InsightItem[];
  rootCauses: InsightItem[];
  problems: InsightItem[];
  focusItems: FocusItem[];
  focusMode: "formations" | "formateurs";
  onFocusModeChange: (mode: "formations" | "formateurs") => void;
};

// Couleurs utilisées pour distinguer les signaux positifs,
// les alertes et les points critiques.
const toneBorder: Record<TrendTone, string> = {
  positive: "border-emerald-200 bg-emerald-50/70",
  warning: "border-amber-200 bg-amber-50/70",
  critical: "border-red-200 bg-red-50/70",
  neutral: "border-slate-200 bg-slate-50",
};

const toneText: Record<TrendTone, string> = {
  positive: "text-emerald-800",
  warning: "text-amber-800",
  critical: "text-red-800",
  neutral: "text-slate-700",
};

function InsightList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: InsightItem[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {/* Composant réutilisable pour afficher une liste d'insights textuels. */}
      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={`${title}-${item.title}`}
            className={`rounded-xl border p-4 ${toneBorder[item.tone]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {item.text}
                </p>
              </div>
              {item.metric && (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneText[item.tone]}`}
                >
                  {item.metric}
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function InsightsSection({
  history,
  trendInsights,
  rootCauses,
  problems,
  focusItems,
  focusMode,
  onFocusModeChange,
}: InsightsSectionProps) {
  // Ce graphique montre l'évolution des indicateurs clés
  // pour donner un contexte temporel avant les explications textuelles.
  const chartData = {
    labels: history.map((point) => point.label),
    datasets: [
      {
        label: "Inscriptions",
        data: history.map((point) => point.enrollments),
        borderColor: "#0f766e",
        backgroundColor: "rgba(15,118,110,0.12)",
        yAxisID: "y",
        tension: 0.35,
      },
      {
        label: "Revenus (DT)",
        data: history.map((point) => point.revenue),
        borderColor: "#1d4ed8",
        backgroundColor: "rgba(29,78,216,0.12)",
        yAxisID: "y1",
        tension: 0.35,
      },
      {
        label: "Reussite (%)",
        data: history.map((point) => point.successRate),
        borderColor: "#b45309",
        backgroundColor: "rgba(180,83,9,0.12)",
        yAxisID: "y2",
        tension: 0.35,
      },
    ],
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Activity size={18} className="text-slate-700" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Trend Analysis
            </h3>
            <p className="text-sm text-slate-500">
              Evolution des indicateurs avec lecture business.
            </p>
          </div>
        </div>
        <div className="h-80">
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: "index", intersect: false },
              plugins: {
                legend: { position: "bottom" },
              },
              scales: {
                y: {
                  type: "linear",
                  position: "left",
                  grid: { color: "rgba(148,163,184,0.18)" },
                },
                y1: {
                  type: "linear",
                  position: "right",
                  grid: { drawOnChartArea: false },
                },
                y2: {
                  type: "linear",
                  position: "right",
                  min: 0,
                  max: 100,
                  grid: { drawOnChartArea: false },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Ici on passe de la visualisation à l'interprétation :
          tendance, causes probables et problèmes détectés. */}
      <div className="grid gap-4 xl:grid-cols-3">
        <InsightList
          title="Interpretation des tendances"
          icon={<Activity size={18} className="text-slate-700" />}
          items={trendInsights}
        />
        <InsightList
          title="Root Cause Analysis"
          icon={<Search size={18} className="text-slate-700" />}
          items={rootCauses}
        />
        <InsightList
          title="Problem Detection"
          icon={<Siren size={18} className="text-slate-700" />}
          items={problems}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-slate-700" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Focus Analysis
              </h3>
              <p className="text-sm text-slate-500">
                Drill-down pour isoler les zones prioritaires.
              </p>
            </div>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {/* Le directeur peut changer l'angle d'analyse :
                soit par formation, soit par formateur. */}
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                focusMode === "formations"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
              onClick={() => onFocusModeChange("formations")}
            >
              Formations
            </button>
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                focusMode === "formateurs"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
              onClick={() => onFocusModeChange("formateurs")}
            >
              Formateurs
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {focusItems.map((item) => (
            <article
              key={`${focusMode}-${item.label}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              {/* Chaque carte de focus synthétise la performance
                  d'un élément précis pour faciliter le drill-down. */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                    {item.secondaryLabel}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.alertCount >= 2
                      ? "bg-red-100 text-red-700"
                      : item.alertCount === 1
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {item.alertCount} alerte{item.alertCount > 1 ? "s" : ""}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Reussite</p>
                  <p className="font-semibold text-slate-900">
                    {item.successRate.toFixed(0)}%
                  </p>
                  <p
                    className={`text-xs ${
                      item.successDelta >= 0 ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {item.successDelta >= 0 ? "+" : ""}
                    {item.successDelta.toFixed(1)} pts
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Revenus</p>
                  <p className="font-semibold text-slate-900">
                    {item.revenue.toLocaleString()} DT
                  </p>
                  <p
                    className={`text-xs ${
                      item.revenueDelta >= 0 ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {item.revenueDelta >= 0 ? "+" : ""}
                    {item.revenueDelta.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Abandon</p>
                  <p className="font-semibold text-slate-900">
                    {item.dropoutRate.toFixed(0)}%
                  </p>
                  <p className="text-xs text-slate-500">niveau de risque</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
