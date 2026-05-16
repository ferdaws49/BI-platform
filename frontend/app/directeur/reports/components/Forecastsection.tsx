"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { TrendingUp, TrendingDown, Minus, Sparkles, RefreshCw } from "lucide-react";
import type { ReportFilters } from "./reportTypes";


ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend,
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForecastPoint {
  mois: string;
  valeur_prevue: number;
  borne_basse: number;
  borne_haute: number;
}

interface ForecastData {
  historique: { mois: string; valeur: number }[];
  previsions: ForecastPoint[];
  tendance: "hausse" | "baisse" | "stable";
  model_used: string;
  insight: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMois(mois: string) {
  const [year, month] = mois.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ForecastSection({ filters }: { filters: ReportFilters }) {
  const [data, setData] = useState<ForecastData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchForecast = () => {
    setLoading(true);
    setError(false);

    const token = localStorage.getItem("access_token");
    const params = new URLSearchParams({
      periodes: "3",
      formation: filters?.formation ?? "Tous",
      type: filters?.type === "Présentiel" ? "présentiel" : filters?.type === "En ligne" ? "en_ligne" : "Tous",
    });

    fetch(`http://localhost:5000/directeur/forecast/inscriptions?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: ForecastData) => {
        setData(json);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchForecast();
  }, [filters]);


  // ── Chart data ─────────────────────────────────────────────────────────────

  const chartData = data ? (() => {
    const histLabels = data.historique.map((h) => formatMois(h.mois));
    const prevLabels = data.previsions.map((p) => formatMois(p.mois));
    const allLabels  = [...histLabels, ...prevLabels];

    const histValues  = data.historique.map((h) => h.valeur);
    const prevValues  = data.previsions.map((p) => p.valeur_prevue);
    const borneHaute  = data.previsions.map((p) => p.borne_haute);
    const borneBasse  = data.previsions.map((p) => p.borne_basse);

    // Padding pour aligner historique vs prévisions
    const histPad = new Array(histLabels.length).fill(null);
    const overlap = [histValues[histValues.length - 1]]; // point de jonction

    return {
      labels: allLabels,
      datasets: [
        {
          label: "Historique",
          data: [...histValues, ...new Array(prevLabels.length).fill(null)],
          borderColor: "#0f766e",
          backgroundColor: "rgba(15,118,110,0.08)",
          borderWidth: 2,
          pointRadius: 4,
          tension: 0.35,
          fill: false,
        },
        {
          label: "Prévision",
          data: [
            ...new Array(histLabels.length - 1).fill(null),
            histValues[histValues.length - 1], // jonction
            ...prevValues,
          ],
          borderColor: "#7c3aed",
          backgroundColor: "rgba(124,58,237,0.08)",
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 5,
          pointStyle: "star",
          tension: 0.35,
          fill: false,
        },
        {
          label: "Borne haute",
          data: [...histPad, overlap[0], ...borneHaute],
          borderColor: "transparent",
          backgroundColor: "rgba(124,58,237,0.10)",
          borderWidth: 0,
          pointRadius: 0,
          fill: "+1",
          tension: 0.35,
        },
        {
          label: "Borne basse",
          data: [...histPad, overlap[0], ...borneBasse],
          borderColor: "transparent",
          backgroundColor: "rgba(124,58,237,0.10)",
          borderWidth: 0,
          pointRadius: 0,
          fill: false,
          tension: 0.35,
        },
      ],
    };
  })() : null;

  // ── Tendance config ────────────────────────────────────────────────────────

  const tendanceConfig = {
    hausse: {
      icon: <TrendingUp size={16} className="text-emerald-600" />,
      pill: "bg-emerald-100 text-emerald-700",
      label: "Tendance haussière",
    },
    baisse: {
      icon: <TrendingDown size={16} className="text-red-600" />,
      pill: "bg-red-100 text-red-700",
      label: "Tendance baissière",
    },
    stable: {
      icon: <Minus size={16} className="text-amber-600" />,
      pill: "bg-amber-100 text-amber-700",
      label: "Stable",
    },
  };

  const cfg = data ? tendanceConfig[data.tendance] : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-violet-100 p-2">
            <Sparkles size={16} className="text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Prévision des inscriptions
            </h3>
            <p className="text-sm text-slate-500">
              Forecast 3 mois · Prophet ML · Intervalle de confiance 80%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data && cfg && (
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.pill}`}>
              {cfg.icon}
              {cfg.label}
            </span>
          )}
          {data && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
              {data.model_used}
            </span>
          )}
          <button
            onClick={fetchForecast}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "Chargement..." : "Actualiser"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          Impossible de charger les prévisions. Vérifiez que le serveur ML est actif.
          <button onClick={fetchForecast} className="ml-3 underline">Réessayer</button>
        </div>
      )}

      {/* Chart + KPIs */}
      {!loading && !error && data && chartData && (
        <div className="space-y-5">

          {/* Insight box */}
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 font-medium">
            {data.insight}
          </div>

          {/* Chart */}
          <div className="h-72">
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: {
                      filter: (item) =>
                        item.text !== "Borne haute" && item.text !== "Borne basse",
                      font: { size: 12 },
                    },
                  },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        if (ctx.dataset.label === "Borne haute" ||
                            ctx.dataset.label === "Borne basse") return "";
                        return ` ${ctx.dataset.label}: ${ctx.parsed.y ?? "-"} inscriptions`;
                      },
                    },
                  },
                },
                scales: {
                  x: { grid: { color: "rgba(148,163,184,0.15)" } },
                  y: {
                    grid: { color: "rgba(148,163,184,0.15)" },
                    ticks: { stepSize: 5 },
                    title: { display: true, text: "Inscriptions", font: { size: 11 } },
                  },
                },
              }}
            />
          </div>

          {/* KPI cards — 3 prochains mois */}
          <div className="grid grid-cols-3 gap-3">
            {data.previsions.map((p) => (
              <div
                key={p.mois}
                className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-center"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-500 mb-1">
                  {formatMois(p.mois)}
                </p>
                <p className="text-2xl font-bold text-violet-900">
                  {p.valeur_prevue}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  [{p.borne_basse} — {p.borne_haute}]
                </p>
              </div>
            ))}
          </div>

        </div>
      )}
    </section>
  );
}