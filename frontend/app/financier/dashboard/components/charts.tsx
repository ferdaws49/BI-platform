"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineElement,
  PointElement,
  LineController,
  BarElement,
  BarController,
  ArcElement,
  DoughnutController,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register Chart.js components
Chart.register(
  LineElement, PointElement, LineController,
  BarElement, BarController,
  ArcElement, DoughnutController,
  CategoryScale, LinearScale,
  Tooltip, Legend, Filler
);

const colors = [
  "rgb(44, 149, 83)", // foncé (accent)
  "rgb(20, 123, 73)",
  "rgb(43, 155, 85)",
  "rgb(17, 101, 85)",
  "rgb(32, 101, 62)",
  "rgb(32, 101, 85)",
  "rgb(32, 101, 62)",
  "rgb(45, 86, 62)",
  "rgb(45, 106, 62)",
];

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs mt-0.5 text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

// ─── Line Chart: CA par mois ────────────────────────────────────────────────
function RevenueLineChart({ data }: { data: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, "rgba(26,113,73,0.25)");
    gradient.addColorStop(1, "rgba(26,113,73,0.0)");

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((d) => d.month),
        datasets: [
          {
            label: "Chiffre d'Affaires",
            data:data.map((d) => d.caRealise),
            borderColor: "#1a7149",
            backgroundColor: gradient,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: "#1a7149",
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
            backgroundColor: "#2d4a3e",
            titleColor: "#fff",
            bodyColor: "rgba(255,255,255,0.7)",
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) =>
                ` ${new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 0 }).format(ctx.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "rgba(45,74,62,0.5)", font: { size: 11, family: "'DM Sans'" } },
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
  }, [data]);

  return <div style={{ height: 220 }}><canvas ref={canvasRef} /></div>;
}

// ─── Bar Chart: Revenu vs Coûts ──────────────────────────────────────────────
function RevenueCostBarChart({ data }: { data: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current  || !data) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: data.map((d) => d.categorie),
        datasets: [
          {
            label: "Revenu",
            data:  data.map((d) => d.revenue),
            backgroundColor: "rgba(26,113,73,0.85)",
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: "Coûts",
            data: data.map((d) => d.cout),
            backgroundColor: "rgba(220,38,38,0.7)",
            borderRadius: 6,
            borderSkipped: false,
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
              boxWidth: 10,
              boxHeight: 10,
              color: "rgba(45,74,62,0.7)",
              font: { size: 11, family: "'DM Sans'" },
              usePointStyle: true,
              pointStyleWidth: 10,
            },
          },
          tooltip: {
            backgroundColor: "#2d4a3e",
            titleColor: "#fff",
            bodyColor: "rgba(255,255,255,0.7)",
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) =>
                ` ${ctx.dataset.label}: ${new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 0 }).format(ctx.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "rgba(45,74,62,0.5)", font: { size: 10, family: "'DM Sans'" } },
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
  }, [data]);

  return <div style={{ height: 220 }}><canvas ref={canvasRef} /></div>;
}


// ─── Doughnut Chart: CA par type ─────────────────────────────────────────────
function FormationDoughnutChart({ data }: { data: any[] }) {
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: data.map((d) => d.formationTitle ?? "Unknown"),
        datasets: [
          {
            data: data.map((d) => d.caRealise),
            backgroundColor: data.map((_, i) => colors[i % colors.length]),
            borderWidth: 0,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            position: "right",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              color: "rgba(45,74,62,0.7)",
              font: { size: 11, family: "'DM Sans'" },
              usePointStyle: true,
              pointStyleWidth: 10,
              padding: 12,
            },
          },
          tooltip: {
            backgroundColor: "#2d4a3e",
            titleColor: "#fff",
            bodyColor: "rgba(255,255,255,0.7)",
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [data]);

  return <div style={{ height: 220 }}><canvas ref={canvasRef} /></div>;
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function ChartsSection({ revenueByMonth, categoryStats, formationStats }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Line Chart — takes 2 cols */}
      <div className="lg:col-span-2">
        <ChartCard
          title="Évolution du Chiffre d'Affaires"
          subtitle="Revenus mensuels cumulés — Exercice 2025"
        >
          <RevenueLineChart data={revenueByMonth ?? []} />
        </ChartCard>
      </div>

      {/* Doughnut Chart */}
      <div>
        <ChartCard
          title="Répartition par Formation"
          subtitle="Part du CA par type de formation"
        >
          <FormationDoughnutChart data={formationStats ?? []} />
        </ChartCard>
      </div>

      {/* Bar Chart — full width */}
      <div className="lg:col-span-3">
        <ChartCard
          title="Revenu vs Coûts par Catégorie"
          subtitle="Comparaison des revenus et coûts directs par domaine de formation"
        >
          <RevenueCostBarChart  data={categoryStats ?? []} />
        </ChartCard>
      </div>
    </div>
  );
}
