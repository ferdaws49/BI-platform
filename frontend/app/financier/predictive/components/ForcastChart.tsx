"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import type { ForecastHorizon, ForecastPoint } from "../types";

Chart.register(
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
);

const HORIZONS: { label: string; value: ForecastHorizon }[] = [
  { label: "1 Mois", value: 1 },
  { label: "3 Mois", value: 3 },
];

interface ForecastChartProps {
  data: ForecastPoint[];
  horizon: ForecastHorizon | null;
  onHorizonChange: (h: ForecastHorizon) => void;
  loading?: boolean;
  showPrediction?: boolean;
}

function SkeletonChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="w-48 h-5 rounded-lg animate-pulse" style={{ background: "#e5eadd" }} />
          <div className="w-32 h-4 rounded-lg animate-pulse" style={{ background: "#e5eadd" }} />
        </div>
        <div className="w-44 h-9 rounded-xl animate-pulse" style={{ background: "#e5eadd" }} />
      </div>
      <div className="w-full rounded-xl animate-pulse" style={{ background: "#e5eadd", height: 260 }} />
    </div>
  );
}

export default function ForecastChart({
  data,
  horizon,
  onHorizonChange,
  loading = false,
  showPrediction = false,
}: ForecastChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext("2d")!;
    
    // Sépare historique et prédiction
    const histData = data.map((d) => d.historical);
    const predData = data.map((d) => d.predicted);
    
    // Trouve l'index du dernier point historique
    const lastHistIdx = data.reduce(
      (acc, pt, idx) => (pt.historical !== null ? idx : acc),
      -1
    );

    // Gradient historique
    const gradHist = ctx.createLinearGradient(0, 0, 0, 280);
    gradHist.addColorStop(0, "rgba(59,130,246,0.18)");
    gradHist.addColorStop(1, "rgba(59,130,246,0.0)");

    // Gradient prédiction
    const gradPred = ctx.createLinearGradient(0, 0, 0, 280);
    gradPred.addColorStop(0, "rgba(26,113,73,0.18)");
    gradPred.addColorStop(1, "rgba(26,113,73,0.0)");

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((d) => d.month),
        datasets: [
          {
            label: "CA Historique",
            data: histData,
            borderColor: "#3b82f6",
            backgroundColor: gradHist,
            borderWidth: 2.5,
            pointRadius: data.map((d) => (d.historical !== null ? 5 : 0)),
            pointBackgroundColor: "#3b82f6",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            tension: 0.4,
            fill: true,
            spanGaps: false,
          },
          ...(showPrediction
            ? [
                {
                  label: "CA Prévisionnel",
                  data: data.map((d, i) => {
                    if (i === lastHistIdx) return d.historical;
                    return d.predicted;
                  }),
                  borderColor: "#1a7149",
                  backgroundColor: gradPred,
                  borderWidth: 2.5,
                  borderDash: [6, 4],
                  pointRadius: data.map((d, i) =>
                    d.predicted !== null && i !== lastHistIdx ? 5 : 0
                  ),
                  pointBackgroundColor: "#1a7149",
                  pointBorderColor: "#fff",
                  pointBorderWidth: 2,
                  tension: 0.4,
                  fill: true,
                  spanGaps: false,
                },
              ]
            : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              color: "rgba(45,74,62,0.7)",
              font: { size: 11, family: "'DM Sans'" },
              usePointStyle: true,
              pointStyleWidth: 10,
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: "#2d4a3e",
            titleColor: "#fff",
            bodyColor: "rgba(255,255,255,0.75)",
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) => {
                if (ctx.parsed.y === null) return "";
                const formatted = new Intl.NumberFormat("fr-TN", {
                  style: "currency",
                  currency: "TND",
                  minimumFractionDigits: 0,
                }).format(ctx.parsed.y);
                return ` ${ctx.dataset.label}: ${formatted}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "rgba(45,74,62,0.5)",
              font: { size: 11, family: "'DM Sans'" },
            },
            border: { display: false },
          },
          y: {
            grid: { color: "rgba(229,234,221,0.8)" },
            ticks: {
              color: "rgba(45,74,62,0.5)",
              font: { size: 11, family: "'DM Sans'" },
              callback: (v) => `${Number(v) / 1000}k`,
            },
            border: { display: false },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [data, showPrediction]);

  if (loading && data.length === 0) return <SkeletonChart />;

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground">
            {showPrediction ? "Prévision du Chiffre d'Affaires" : "Historique du Chiffre d'Affaires"}
          </h3>
          <p className="text-xs mt-0.5 text-muted-foreground">
            {showPrediction
              ? "CA historique vs modèle prédictif IA"
              : "Données historiques du centre de formation"}
          </p>
        </div>

        {/* Boutons de prédiction */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary border border-border">
          {HORIZONS.map((h) => (
            <button
              key={h.value}
              onClick={() => onHorizonChange(h.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                horizon === h.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/60 hover:bg-accent/20 hover:text-accent-foreground"
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 280 }}>
        {data.length > 0 ? (
          <canvas ref={canvasRef} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Aucune donnée à afficher
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 rounded" style={{ background: "#3b82f6" }} />
          <span className="text-xs" style={{ color: "#2d4a3e", opacity: 0.5 }}>
            Données réelles
          </span>
        </div>
        {showPrediction && (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 rounded"
              style={{
                background:
                  "repeating-linear-gradient(to right, #1a7149 0, #1a7149 4px, transparent 4px, transparent 8px)",
              }}
            />
            <span className="text-xs" style={{ color: "#2d4a3e", opacity: 0.5 }}>
              Prévision IA
            </span>
          </div>
        )}
      </div>
    </div>
  );
}