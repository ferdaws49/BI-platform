"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  BarElement, BarController,
  LineElement, PointElement, LineController,
  ArcElement, DoughnutController,
  CategoryScale, LinearScale,
  Tooltip, Legend, Filler,
  TooltipItem,
} from "chart.js";
import { glassCard, SectionTitle, fmtCurrency } from "../ui";

import type { SessionCoutRow } from "../../types";

Chart.register(
  BarElement, BarController,
  LineElement, PointElement, LineController,
  ArcElement, DoughnutController,
  CategoryScale, LinearScale,
  Tooltip, Legend, Filler,
);

const TOOLTIP_STYLE = {
  backgroundColor: "#2d4a3e",
  titleColor: "#fff",
  bodyColor: "rgba(255,255,255,0.72)",
  padding: 10,
  cornerRadius: 10,
};

// ── 1. Bar chart — Formateurs les plus coûteux ─────────────
export function FormateursCoutChart({ formateursCoutData }: { formateursCoutData: FormateurCoutPoint[] }) {
  const ref     = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current || !formateursCoutData) return;
    chartRef.current?.destroy();

    chartRef.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: formateursCoutData.map(d => d.formateur.split(" ")[0]),
        datasets: [
          {
            label: "Coût total",
            data: formateursCoutData.map(d => d.coutTotal),
            backgroundColor: formateursCoutData.map(d => d.couleur + "CC"),
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",          // Horizontal bars — plus lisible avec les noms
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_STYLE,
            callbacks: {
              label: ctx =>
                ` Coût : ${fmtCurrency(ctx.parsed.x ?? 0)}  ·  ${formateursCoutData[ctx.dataIndex].nbSessions} sessions`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(229,234,221,0.8)" },
            ticks: {
              color: "rgba(45,74,62,0.5)",
              font: { size: 10 },
              callback: v => `${Number(v) / 1000}k`,
            },
            border: { display: false },
          },
          y: {
            grid: { display: false },
            ticks: { color: "rgba(45,74,62,0.65)", font: { size: 11 } },
            border: { display: false },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [formateursCoutData]);

  return <div style={{ height: 220 }}><canvas ref={ref} /></div>;
}

// ── 2. Combo Bar + Line — Efficience par session ───────────
export function EfficienceComboChart({ rows }: { rows: SessionCoutRow[] }) {
  const ref     = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current || !rows) return;
    chartRef.current?.destroy();

    const labels = rows.map(r => r.sessionNom.split(" ").slice(0, 2).join(" "));
    const couts  = rows.map(r => r.coutTotal);
    const coutsParEtu = rows.map(r =>
      r.inscrits > 0 ? Math.round(r.coutTotal / r.inscrits) : 0,
    );

    chartRef.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            type: "bar",
            label: "Coût Total Session",
            data: couts,
            backgroundColor: "rgba(45,74,62,0.75)",
            borderRadius: 6,
            borderSkipped: false,
            yAxisID: "y",
          },
          {
            type: "line",
            label: "Coût / Étudiant",
            data: coutsParEtu,
            borderColor: "#DC2626",
            backgroundColor: "rgba(220,38,38,0.08)",
            borderWidth: 2.5,
            pointRadius: 5,
            pointBackgroundColor: "#DC2626",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            tension: 0.35,
            yAxisID: "y2",
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              boxWidth: 10, boxHeight: 10,
              color: "rgba(45,74,62,0.65)",
              font: { size: 11 },
              usePointStyle: true,
            },
          },
          tooltip: {
            ...TOOLTIP_STYLE,
            callbacks: {
              label: (ctx: TooltipItem<'bar' | 'line'>) =>
                ctx.datasetIndex === 0
                  ? ` Coût session : ${fmtCurrency(ctx.parsed.y ?? 0)}`
                  : ` Coût / étudiant : ${fmtCurrency(ctx.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "rgba(45,74,62,0.5)", font: { size: 9 }, maxRotation: 30 },
            border: { display: false },
          },
          y: {
            position: "left",
            grid: { color: "rgba(229,234,221,0.8)" },
            ticks: {
              color: "rgba(45,74,62,0.5)",
              font: { size: 10 },
              callback: (v: number | string) => `${Number(v) / 1000}k`,
            },
            border: { display: false },
            title: {
              display: true, text: "Coût total (TND)",
              color: "rgba(45,74,62,0.4)", font: { size: 10 },
            },
          },
          y2: {
            position: "right",
            grid: { display: false },
            ticks: { color: "rgba(220,38,38,0.6)", font: { size: 10 } },
            border: { display: false },
            title: {
              display: true, text: "Coût / étudiant (TND)",
              color: "rgba(220,38,38,0.5)", font: { size: 10 },
            },
          },
        },
      },
    } );

    return () => chartRef.current?.destroy();
  }, [rows]);

  return <div style={{ height: 240 }}><canvas ref={ref} /></div>;
}

// ── 3. Pie chart — Répartition des dépenses ────────────────
export function RepartitionPieChart({ repartitionData }: { repartitionData: RepartitionDepense[] }) {
  const ref     = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current || !repartitionData) return;
    chartRef.current?.destroy();

    chartRef.current = new Chart(ref.current, {
      type: "doughnut",
      data: {
        labels: repartitionData.map(d => d.label),
        datasets: [
          {
            data: repartitionData.map(d => d.value),
            backgroundColor: repartitionData.map(d => d.couleur),
            borderWidth: 0,
            hoverOffset: 10,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_STYLE,
            callbacks: { label: ctx => ` ${ctx.label} : ${ctx.parsed}%` },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [repartitionData]);

  if (!repartitionData) return <div style={{ height: 180 }} className="animate-pulse bg-white/50 rounded-lg"></div>;

  return (
    <div>
      <div style={{ height: 180 }}><canvas ref={ref} /></div>
      <div className="flex flex-col gap-2 mt-4">
        {repartitionData.map(d => (
          <div key={d.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: d.couleur }} />
              <span style={{ color: "#2d4a3e" }}>{d.label}</span>
            </div>
            <span className="font-bold" style={{ color: d.couleur }}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. Line chart — Trend des coûts ───────────────────────
export function TrendCoutsChart({ trendData }: { trendData: TrendPoint[] }) {
  const ref     = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current || !trendData) return;
    chartRef.current?.destroy();

    const activePoints = trendData.filter(d => d.coutTotal > 0);

    const ctx = ref.current.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0,   "rgba(220,38,38,0.18)");
    gradient.addColorStop(1,   "rgba(220,38,38,0.0)");

    chartRef.current = new Chart(ref.current, {
      type: "line",
      data: {
        labels: trendData.map(d => d.mois),
        datasets: [
          {
            label: "Coût total",
            data: trendData.map(d => d.coutTotal || null),
            borderColor: "#DC2626",
            backgroundColor: gradient,
            borderWidth: 2.5,
            pointRadius: 5,
            pointBackgroundColor: "#DC2626",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_STYLE,
            callbacks: {
              label: ctx => ` Coût : ${fmtCurrency(ctx.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "rgba(45,74,62,0.5)", font: { size: 11 } },
            border: { display: false },
          },
          y: {
            grid: { color: "rgba(229,234,221,0.8)" },
            ticks: {
              color: "rgba(45,74,62,0.5)",
              font: { size: 10 },
              callback: v => `${Number(v) / 1000}k`,
            },
            border: { display: false },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [trendData]);

  return <div style={{ height: 190 }}><canvas ref={ref} /></div>;
}

// ── Exported layout: 2×2 grid ─────────────────────────────
import { FormateurCoutPoint, RepartitionDepense, TrendPoint } from "../../types";

interface ChartsSectionProps {
  filteredRows: SessionCoutRow[];
  formateursCoutData: FormateurCoutPoint[];
  repartitionData: RepartitionDepense[];
  trendData: TrendPoint[];
}

export default function ChartsSection({
  filteredRows,
  formateursCoutData,
  repartitionData,
  trendData
}: ChartsSectionProps) {
  return (
    <div className="space-y-4">
      {/* Row 1 : Bar formateurs + Pie répartition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl p-5" style={glassCard}>
          <SectionTitle
            title="Formateurs les plus coûteux"
            sub="Coût total par formateur sur la période"
          />
          <FormateursCoutChart formateursCoutData={formateursCoutData} />
        </div>

        <div className="rounded-2xl p-5" style={glassCard}>
          <SectionTitle
            title="Répartition des dépenses"
            sub="Formateurs vs Logistique"
          />
          <RepartitionPieChart repartitionData={repartitionData} />
        </div>
      </div>

      {/* Row 2 : Combo efficience + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl p-5" style={glassCard}>
          <SectionTitle
            title="Analyse d'Efficience par Session"
            sub="Barres = Coût total · Ligne rouge = Coût par étudiant (axe droit)"
          />
          <EfficienceComboChart rows={filteredRows.slice(0, 8)} />
        </div>

        <div className="rounded-2xl p-5" style={glassCard}>
          <SectionTitle
            title="Trend des Coûts"
            sub="Évolution mensuelle du coût total"
          />
          <TrendCoutsChart trendData={trendData} />
        </div>
      </div>
    </div>
  );
}
