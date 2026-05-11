"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Chart, LineElement, PointElement, LineController,
  BarElement, BarController, ArcElement, DoughnutController,
  BubbleController, CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from "chart.js";
import {
  glassCard, fmtCurrency, KPICard, SectionTitle,
  SearchBox, ExportBtn, FilterSelect, GrowthBadge, COLORS,
} from  "@/app/financier/revenue/components/ui";
import { revenueApi } from "@/lib/financier-revenue.api";
import { BubblePt, CatShare, RevEvolution, TableResp, TopForm } from "../../types";


Chart.register(
  LineElement, PointElement, LineController,
  BarElement, BarController, ArcElement, DoughnutController, BubbleController,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
);

const CHART_TOOLTIP = {
  backgroundColor: "#2d4a3e", titleColor: "#fff",
  bodyColor: "rgba(255,255,255,0.7)", padding: 10,
  cornerRadius: 10, displayColors: true,
};

const PALETTE = ["#1a7149", "#2d4a3e", "#3b82f6", "#D97706", "#8b5cf6", "#DC2626", "#4a9e7a", "#e11d48"];

// ── Multi-line chart ──────────────────────────────────────
function RevenueLineChart({ data }: { data: RevEvolution }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(data.series.map((s, i) => [s.formationId, i < 3]))
  );

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    const datasets = data.series.map((s, i) => {
      const color = PALETTE[i % PALETTE.length];
      return{
        label: s.formationTitle,
      data: s.monthlyRevenue,
      borderColor: color,
      backgroundColor: "transparent",
      borderWidth: visible[s.formationId] ? 2.5 : 0.5,
      pointRadius: visible[s.formationId] ? 4 : 0,
      pointBackgroundColor: color,
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      tension: 0.4,
      hidden: !visible[s.formationId],
      };
      
    });
    chartRef.current = new Chart(ref.current, {
      type: "line",
      data: { labels: data.months, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...CHART_TOOLTIP,
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtCurrency(ctx.parsed.y ?? 0)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "rgba(45,74,62,0.5)", font: { size: 11 } }, border: { display: false } },
          y: { grid: { color: "rgba(229,234,221,0.8)" }, ticks: { color: "rgba(45,74,62,0.5)", font: { size: 11 }, callback: v => `${Number(v)/1000}k` }, border: { display: false } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data, visible]);

  return (
    <div>
      <div style={{ height: 220 }}><canvas ref={ref} /></div>
      {/* Interactive legend */}
      <div className="flex flex-wrap gap-2 mt-3">
        {data.series.map((s, i) => {
          const color = PALETTE[i % PALETTE.length];
          const isVisible = visible[s.formationId];
          return(
            <button key={s.formationId} onClick={() => setVisible(v => ({ ...v, [s.formationId]: !v[s.formationId] }))}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all"
            style={{ background: isVisible ? `${color}18` : "#efefea", color: isVisible ? color : "rgba(45,74,62,0.4)", border: `1px solid ${isVisible ? color + "40" : "#e5eadd"}`, fontFamily: "'DM Sans'" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: color, opacity: isVisible ? 1 : 0.3 }} />
            {s.formationTitle.split(" ")[0]}
          </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Bar chart top 5 ───────────────────────────────────────
function RevenueBarChart({ data }: { data: TopForm[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  useEffect(() => {
    if (!ref.current || !data.length) return;
    chartRef.current?.destroy();
    const colors = data.map((_, i) => PALETTE[i % PALETTE.length] + "CC");
    chartRef.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: data.map(d => d.formationTitle.split(" ")[0]),
        datasets: [{
          label: "CA",
          data: data.map(d => d.caRealise),
          backgroundColor: colors,
          borderRadius: 8, borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { ...CHART_TOOLTIP, callbacks: { label: ctx => ` CA: ${fmtCurrency(ctx.parsed.y ?? 0)}` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "rgba(45,74,62,0.5)", font: { size: 10 } }, border: { display: false } },
          y: { grid: { color: "rgba(229,234,221,0.8)" }, ticks: { color: "rgba(45,74,62,0.5)", font: { size: 10 }, callback: v => `${Number(v)/1000}k` }, border: { display: false } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, []);
  return <div style={{ height: 200 }}><canvas ref={ref} /></div>;
}

// ── Pie chart catégories ──────────────────────────────────
function CategoryPieChart({ data }: { data: CatShare[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const colors = useMemo(() => data.map((_, i) => PALETTE[i % PALETTE.length] + "CC"), [data]);
  useEffect(() => {
    if (!ref.current || !data.length) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "doughnut",
      data: {
        labels: data.map(c => c.category),
        datasets: [{ data: data.map(c => c.revenue), backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "65%",
        plugins: {
          legend: { display: false },
          tooltip: { ...CHART_TOOLTIP, callbacks: { label: ctx => {
                const pct = data[ctx.dataIndex].percent.toFixed(1);
                return ` ${ctx.label}: ${pct}% (${fmtCurrency(Number(ctx.raw))})`;
              } 
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [data, colors]);

  return (
    <div>
      <div style={{ height: 160 }}><canvas ref={ref} /></div>
      <div className="flex flex-col gap-1.5 mt-3">
        {data.map((c, i) => (
          <div key={c.category} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: colors[i] }} />
              <span style={{ color: "#2d4a3e" }}>{c.category}</span>
            </div>
            <div className="flex items-center gap-3">
              <span style={{ color: "#2d4a3e", opacity: 0.5 }}>{fmtCurrency(c.revenue)}</span>
              <span className="font-semibold" style={{ color: colors[i] }}>{c.percent.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bubble chart ──────────────────────────────────────────
function BubbleChart({ data }: { data: BubblePt[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  useEffect(() => {
    if (!ref.current || !data.length ) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "bubble",
      data: {
        datasets: data.map((b, i) => ({
          label: b.formationTitle,
          data: [{ x: b.inscriptions, y: b.revenue / 1000, r: Math.max(5, Math.min(30, b.bubbleSize / 500)) }],
          backgroundColor: PALETTE[i % PALETTE.length] + "99",
          borderColor:PALETTE[i % PALETTE.length],
          borderWidth: 1.5,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10, color: "rgba(45,74,62,0.6)", font: { size: 10 }, usePointStyle: true } },
          tooltip: {
            ...CHART_TOOLTIP,
            callbacks: {
              label: (ctx: any) => {
                const b = data[ctx.datasetIndex];
                return [`  ${b.formationTitle}`, `  Inscrits: ${b.inscriptions}`, `  Revenu: ${fmtCurrency(b.revenue)}`, `  ${b.bubbleMetric === 'margin' ? 'Marge' : 'Prix'}: ${fmtCurrency(b.bubbleSize)}`];
              },
            },
          },
        },
        scales: {
          x: { title: { display: true, text: "Nombre d'inscrits", color: "rgba(45,74,62,0.5)", font: { size: 11 } }, grid: { color: "rgba(229,234,221,0.8)" }, ticks: { color: "rgba(45,74,62,0.5)", font: { size: 10 } }, border: { display: false } },
          y: { title: { display: true, text: "Revenu (k TND)", color: "rgba(45,74,62,0.5)", font: { size: 11 } }, grid: { color: "rgba(229,234,221,0.8)" }, ticks: { color: "rgba(45,74,62,0.5)", font: { size: 10 }, callback: v => `${v}k` }, border: { display: false } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data]);
  return <div style={{ height: 280 }}><canvas ref={ref} /></div>;
}

// ── Sessions Table ────────────────────────────────────────
function SessionsTable({ data }: { data: TableResp | null }) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<"ca" | "inscrits" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const PER = 5;

  const rows = data?.items ?? [];

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => r.session.toLowerCase().includes(q) || r.formation.toLowerCase().includes(q));
  }, [rows, search]);
    

  const paged = filtered.slice((page - 1) * PER, page * PER);
  const pages = Math.ceil(filtered.length / PER);

  function toggleSort(col: "ca" | "inscrits") {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  const SortIcon = ({ col }: { col: "ca" | "inscrits" }) => (
    <span className="ml-1 opacity-40 text-xs">{sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
  );

  return (
    <div className="rounded-2xl overflow-hidden" style={glassCard}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: "#e5eadd" }}>
        <div>
          <p className="font-bold text-sm" style={{ color: "#2d4a3e", fontFamily: "'Sora', sans-serif" }}>CA par session</p>
          <p className="text-xs" style={{ color: "#2d4a3e", opacity: 0.4 }}>{filtered.length} sessions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SearchBox value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Session ou formation..." />
          <ExportBtn />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "28%" }} /><col style={{ width: "18%" }} />
            <col style={{ width: "10%" }} /><col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr style={{ background: "rgba(229,234,221,0.35)" }}>
              {["Session", "Formation", "Date", "Inscrits ↕", "Montant", "CA ↕", "vs Préc."].map((h, i) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#2d4a3e", opacity: 0.5, cursor: i === 3 || i === 5 ? "pointer" : "default" }}
                  onClick={() => { if (i === 3) toggleSort("inscrits"); if (i === 5) toggleSort("ca"); }}>
                  {h === "Inscrits ↕" ? <span>Inscrits<SortIcon col="inscrits" /></span> :
                    h === "CA ↕" ? <span>CA<SortIcon col="ca" /></span> : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(row => (
              <tr key={row.sessionId} className="hover:bg-white/50 transition-colors border-t" style={{ borderColor: "#e5eadd" }}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-xs truncate" style={{ color: "#2d4a3e" }}>{row.session}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: "rgba(26,113,73,0.08)", color: "#1a7149" }}>
                    {row.formation.split(" ")[0]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "#2d4a3e", opacity: 0.5 }}>{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold" style={{ color: "#2d4a3e" }}>{row.inscrits}{row.capacite ? `/${row.capacite}` : ''}</span>
                    {row.capacite > 0 && (
                      <div className="w-14 h-1.5 rounded-full" style={{ background: "#e5eadd" }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min((row.inscrits / row.capacite) * 100, 100)}%`,  background: row.inscrits / row.capacite >= 0.8 ? "#1a7149" : "#D97706" }} />
                    </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "#2d4a3e", opacity: 0.6 }}>{fmtCurrency(row.prix)}</td>
                <td className="px-4 py-3 text-xs font-bold" style={{ color: "#2d4a3e" }}>{fmtCurrency(row.caEncaisse)}</td>
                <td className="px-4 py-3"><GrowthBadge value={row.variation.variationPercent} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "#e5eadd" }}>
          <span className="text-xs" style={{ color: "#2d4a3e", opacity: 0.4 }}>Page {page}/{pages}</span>
          <div className="flex gap-1">
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className="w-7 h-7 rounded-lg text-xs font-medium transition-all"
                style={{ background: page === i + 1 ? "#1a7149" : "transparent", color: page === i + 1 ? "#fff" : "#2d4a3e" }}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main CA Tab ───────────────────────────────────────────
export default function CATab({ filters }: { filters: Record<string, any> }) {
  const [kpi, setKpi] = useState<any>(null);
  const [evolution, setEvolution] = useState<RevEvolution | null>(null);
  const [topFormations, setTopFormations] = useState<TopForm[]>([]);
  const [categories, setCategories] = useState<CatShare[]>([]);
  const [bubbles, setBubbles] = useState<BubblePt[]>([]);
  const [table, setTable] = useState<TableResp | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [k, ev, top, cat, bub, tab] = await Promise.all([
          revenueApi.getKpiCards(filters),
          revenueApi.getRevenueEvolution(filters),
          revenueApi.getTopFormationsBar(filters),
          revenueApi.getCategoryPie(filters),
          revenueApi.getBubble(filters),
          revenueApi.getSessionsTable(filters),
        ]);
        if (!cancelled) {
          setKpi(k);
          setEvolution(ev);
          setTopFormations(top);
          setCategories(cat);
          setBubbles(bub);
          setTable(tab);
        }
      } catch (e) {
        console.error("Erreur chargement CA:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [filters]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl" style={{ background: "rgba(229,234,221,0.5)" }} />)}
        </div>
        <div className="h-64 rounded-2xl" style={{ background: "rgba(229,234,221,0.5)" }} />
      </div>
    );
  }

  const totalCA = kpi?.totalRevenue ?? 0;
  const growth = kpi?.totalRevenueGrowthPercent ?? 0;
  const recovery = kpi?.recoveryRatePercent ?? 0;
  const topForm = kpi?.topFormation;
  const avgBasket = kpi?.averageBasket ?? 0;
  const avgBasketGrowth = kpi?.averageBasketGrowthPercent ?? 0;


  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="CA Total" value={fmtCurrency(totalCA)}
          badge={<span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: growth >= 0 ? "rgba(26,113,73,0.12)" : "rgba(220,38,38,0.1)", color: growth >= 0 ? "#1a7149" : "#DC2626" }}>{growth >= 0 ? "▲" : "▼"} 
          {Math.abs(growth).toFixed(1)}%</span>}
          sub="vs période précédente" />

        <KPICard label="Taux de Recouvrement" value={`${recovery.toFixed(1)}%`}  accentColor="#3b82f6"
          sub="Total encaissé / Total facturé × 100" />

        <KPICard label="Top Formation" value={topForm?.title ?? "—"}  accentColor="#2d4a3e"
          badge={topForm ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(26,113,73,0.12)", color: "#1a7149" }}>{fmtCurrency(topForm.revenue)}</span>: undefined}
          sub={topForm ? `Formation #${topForm.formationId}` : "Aucune donnée"} />

        <KPICard label="Panier Moyen" value={fmtCurrency(avgBasket)}
          badge={<span className="text-xs px-2 py-0.5 rounded-full" style={{ background: avgBasketGrowth >= 0 ? "rgba(26,113,73,0.12)" : "rgba(217,119,6,0.12)", color: avgBasketGrowth >= 0 ? "#1a7149" : "#D97706" }}>{avgBasketGrowth >= 0 ? "▲" : "▼"} {Math.abs(avgBasketGrowth).toFixed(1)}%</span>}
          sub="Revenu total / Nombre d'inscriptions" accentColor="#D97706" />
      </div>

      {/* Line chart + Bar chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl p-5" style={glassCard}>
          <SectionTitle title="Évolution du CA par Formation" sub="Multi-courbes — cliquez sur la légende pour filtrer" />
          {evolution && <RevenueLineChart data={evolution} />}
        </div>
        <div className="rounded-2xl p-5" style={glassCard}>
          <SectionTitle title="Répartition par Catégorie" sub="Part du CA total" />
          {categories.length > 0 && <CategoryPieChart data={categories} />}
        </div>
      </div>


      {/* Bar chart + Bubble chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={glassCard}>
          <SectionTitle title="Top Formations par CA" sub="Revenus par formation — exercice 2025" />
          {topFormations.length > 0 && <RevenueBarChart data={topFormations} />}
        </div>

        <div className="rounded-2xl p-5" style={glassCard}>
          <SectionTitle title="Analyse Inscrits vs Revenu" sub="Taille de bulle = marge ou prix" />
          <p className="text-xs mb-2" style={{ color: "#2d4a3e", opacity: 0.5 }}>
            Haut-gauche = formations Premium · Bas-droite = formations Massives
          </p>
          {bubbles.length > 0 && <BubbleChart data={bubbles} />}
        </div>
      </div>

      {/* Table */}
      <SessionsTable data={table}  />
    </div>
  );
}
