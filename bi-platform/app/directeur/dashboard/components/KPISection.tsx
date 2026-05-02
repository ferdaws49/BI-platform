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
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

// ─── Types ────────────────────────────────────────────────────────────────────
/**
 * Represents a single KPI card data.
 * @property title - The label of the KPI (e.g., "Apprenants")
 * @property value - The main number or string to display
 * @property trend - Direction of the trend (up, down, or stable) for visual indicator
 * @property delta - The percentage or amount of change
 * @property icon - Visual emoji or icon representing the KPI
 */
type KPIItem = {
  title: string;
  value: string;
  trend: "up" | "down" | "stable";
  delta: string;
  icon: string;
};

/**
 * Structure of a training record used in the recap table.
 */
type TrainingRecord = {
  formation: string;
  learners: number;
  success: number;
  revenue: number;
  statut: "Actif" | "Terminé" | "Annulé";
  type: "Présentiel" | "En ligne";
  formateur: string;
};

// Maps human-readable periods to backend-compatible query parameters.
const periodeMap: Record<string, string> = {
  "Ce mois": "month",
  Trimestre: "quarter",
  Semestre: "semester",
  Année: "year",
};

/**
 * Mock data for the training summary table.
 * Used for visual representation when backend data for the table isn't available.
 */
const trainingData: TrainingRecord[] = [
  { formation: "Data Science", learners: 52, success: 92, revenue: 12800, statut: "Actif", type: "En ligne", formateur: "Amine" },
  { formation: "Web Dev", learners: 36, success: 85, revenue: 9400, statut: "Terminé", type: "Présentiel", formateur: "Sara" },
  { formation: "UI/UX", learners: 17, success: 78, revenue: 5100, statut: "Actif", type: "En ligne", formateur: "Mohamed" },
  { formation: "Java", learners: 68, success: 90, revenue: 15400, statut: "Actif", type: "Présentiel", formateur: "Amine" },
  { formation: "Data Engineering", learners: 24, success: 80, revenue: 9600, statut: "Actif", type: "En ligne", formateur: "Sara" },
  { formation: "Marketing", learners: 13, success: 72, revenue: 3900, statut: "Annulé", type: "Présentiel", formateur: "Mohamed" },
];

/**
 * Fallback values for KPIs displayed when the backend cannot be reached.
 */
const fallbackKpis: KPIItem[] = [
  { title: "Apprenants", value: "—", trend: "stable", delta: "Backend offline", icon: "👤" },
  { title: "Chiffre d'affaires", value: "—", trend: "stable", delta: "Backend offline", icon: "💶" },
  { title: "Taux de réussite", value: "—", trend: "stable", delta: "Backend offline", icon: "✅" },
  { title: "Formations actives", value: "—", trend: "stable", delta: "Backend offline", icon: "📚" },
];

// ─── Chart options (light theme fixed) ────────────────────────────────────────
function getChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#6b7280", font: { size: 11 } } },
    },
    scales: {
      x: { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { color: "#6b7280" } },
      y: { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { color: "#6b7280" } },
    },
  };
}

function getPieOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#6b7280", font: { size: 11 } } },
    },
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function KPISection({ filters }: { filters: FilterOptions }) {

  // Indicates if data is currently being fetched from the API
  const [loading, setLoading] = useState(true);
  // Toggle to simulate an empty state (no data available)
  const [showEmpty, setShowEmpty] = useState(false);
  // Current field used for sorting the training table
  const [sortBy, setSortBy] = useState<keyof TrainingRecord>("success");
  // Direction of the sort (ascending or descending)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // Current page number for the table pagination
  const [page, setPage] = useState(1);
  // List of processed KPI items to display in the cards
  const [kpis, setKpis] = useState<KPIItem[]>([]);

  // ── Fetch Logic ────────────────────────────────────────────────────────────
  // Triggers whenever filters change (period, course, trainer, etc.)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        // Build query string from active filters
        const params = new URLSearchParams();
        if (filters.periode && filters.periode !== "Ce mois") {
          const mappedPeriode = periodeMap[filters.periode];
          if (mappedPeriode) params.append("periode", mappedPeriode);
        }
        if (filters.formation && filters.formation !== "Tous") params.append("formation", filters.formation);
        if (filters.formateur && filters.formateur !== "Tous") params.append("formateur", filters.formateur);
        if (filters.type && filters.type !== "Tous") params.append("type", filters.type);
        if (filters.statut && filters.statut !== "Tous") {
          const statutMap: Record<string, string> = { Actif: "actif", Terminé: "terminé", Annulé: "annulé" };
          params.append("statut", statutMap[filters.statut] ?? filters.statut);
        }

        const queryPart = params.toString() ? `?${params.toString()}` : "";
        const base = "http://localhost:5000";

        // Parallel fetch for overall stats and specific KPI metrics
        const [overviewRes, kpisRes] = await Promise.all([
          fetch(`${base}/dashboard/overview${queryPart}`, { headers }),
          fetch(`${base}/dashboard/kpis${queryPart}`, { headers }),
        ]);

        if (!overviewRes.ok || !kpisRes.ok) throw new Error("Backend response not OK");

        const overview = await overviewRes.json();
        const kpiData = await kpisRes.json();

        // Transformation: Mapping API response data to KPIItem objects for the UI
        setKpis([
          {
            title: "Apprenants",
            value: overview.totalApprenants?.toString() ?? "—",
            // Trend is 'up' if growth rate is positive, otherwise 'down'
            trend: (kpiData.tauxCroissanceApprenants ?? 0) >= 0 ? "up" : "down",
            delta: `${(kpiData.tauxCroissanceApprenants ?? 0) > 0 ? "+" : ""}${kpiData.tauxCroissanceApprenants ?? 0}%`,
            icon: "👤",
          },
          {
            title: "Chiffre d'affaires",
            value: `${(overview.revenuTotal ?? 0).toLocaleString()} DT`,
            trend: "up",
            delta: `${(kpiData.revenuMensuel ?? 0).toLocaleString()} DT ce mois`,
            icon: "💶",
          },
          {
            title: "Taux de réussite",
            value: `${kpiData.tauxReussite ?? 0}%`,
            // Success rate trend is considered positive if >= 50%
            trend: (kpiData.tauxReussite ?? 0) >= 50 ? "up" : "down",
            delta: "",
            icon: "✅",
          },
          {
            title: "Formations actives",
            value: kpiData.formationsActives?.toString() ?? "—",
            trend: "stable",
            delta: `/ ${overview.totalFormations ?? 0} total`,
            icon: "📚",
          },
        ]);
      } catch {
        // Use static fallback data if the backend server is unreachable
        setKpis(fallbackKpis);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filters]);

  // ── Filtrage + Tri Local (Table) ───────────────────────────────────────────
  // Computes the data to display in the table based on active filters and sorting criteria
  const filteredTableData = useMemo(() => {
    let records = [...trainingData];
    // Apply local filtering to mock data
    if (filters.formation !== "Tous") records = records.filter((r) => r.formation === filters.formation);
    if (filters.formateur !== "Tous") records = records.filter((r) => r.formateur === filters.formateur);
    if (filters.type !== "Tous") records = records.filter((r) => r.type === filters.type);
    if (filters.statut !== "Tous") records = records.filter((r) => r.statut === filters.statut);
    
    // Sort logic for numbers and strings
    records.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      if (typeof aValue === "number" && typeof bValue === "number")
        return sortDir === "asc" ? aValue - bValue : bValue - aValue;
      return sortDir === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
    return records;
  }, [filters, sortBy, sortDir]);

  // Pagination constants
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredTableData.length / pageSize));
  // Data for the current page
  const pagedData = filteredTableData.slice((page - 1) * pageSize, page * pageSize);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [filters]);

  // ── Chart Data (Demonstration) ─────────────────────────────────────────────
  // Bar chart: Inscriptions evolution over time (S1-S6)
  const barData = {
    labels: ["S1", "S2", "S3", "S4", "S5", "S6"],
    datasets: [{ label: "Inscriptions", data: [72, 80, 88, 93, 100, 110], backgroundColor: "#4ade80" }],
  };
  // Line chart: Revenue (CA) progression
  const lineData = {
    labels: ["S1", "S2", "S3", "S4", "S5", "S6"],
    datasets: [{
      label: "CA",
      data: [11000, 12300, 13700, 14900, 16000, 17200],
      borderColor: "#16a34a",
      backgroundColor: "rgba(16,164,74,0.2)",
      tension: 0.3,
    }],
  };
  // Pie chart: Distribution of registrations by course type
  const pieData = {
    labels: ["Data Science", "Web Dev", "UI/UX", "Java"],
    datasets: [{ data: [30, 25, 20, 25], backgroundColor: ["#a7f3d0", "#86efac", "#22c55e", "#15803d"] }],
  };

  /**
   * Toggles sorting direction or switches sorting field.
   */
  const handleSort = (field: keyof TrainingRecord) => {
    if (sortBy === field) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir("desc"); }
    setPage(1);
  };

  // ── Classes dark-aware (CSS variables) ─────────────────────────────────────
  const card = "rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow";
  const cardHeader = "text-sm font-semibold text-foreground mb-3";
  const mutedText = "text-muted-foreground";
  const tableHead = "bg-muted text-xs uppercase text-muted-foreground";
  const tableRow = "hover:bg-accent/20 transition-colors";
  const tableDivide = "divide-y divide-border";

  return (
    <main className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Indicateurs clés (KPI)
          </h3>
          {(filters.statut !== "Tous" || filters.formation !== "Tous" || filters.periode !== "Ce mois") && (
            <p className={`text-xs ${mutedText} mt-0.5`}>
              Filtres actifs:{" "}
              {[
                filters.periode !== "Ce mois" && filters.periode,
                filters.formation !== "Tous" && filters.formation,
                filters.statut !== "Tous" && filters.statut,
                filters.type !== "Tous" && filters.type,
                filters.formateur !== "Tous" && filters.formateur,
              ].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <button
          className="rounded-lg border border-border bg-card px-3 py-1 text-xs text-foreground hover:bg-accent/20 transition-colors"
          onClick={() => setShowEmpty((prev) => !prev)}
        >
          {showEmpty ? "Réafficher les KPIs" : "Activer état vide"}
        </button>
      </div>

      {/* ══ 1. KPI CARDS ══════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-3" />
              <div className="h-8 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : showEmpty ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Aucune donnée disponible pour la période sélectionnée.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <div key={item.title} className={card}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl">{item.icon}</span>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold flex items-center gap-1
                  ${item.trend === "up"
                    ? "bg-success/15 text-success"
                    : item.trend === "down"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.trend === "up" ? "↑" : item.trend === "down" ? "↓" : "→"} {item.delta}
                </span>
              </div>
              <p className={`mt-3 text-sm ${mutedText}`}>{item.title}</p>
              <p className="text-2xl font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ══ 2. CHARTS ═════════════════════════════════════════════════════════ */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className={card}>
          <h4 className={cardHeader}>Inscriptions par période</h4>
          <div className="h-44">
            <Bar data={barData} options={getChartOptions()} />
          </div>
        </div>
        <div className={card}>
          <h4 className={cardHeader}>Évolution CA</h4>
          <div className="h-44">
            <Line data={lineData} options={getChartOptions()} />
          </div>
        </div>
        <div className={card}>
          <h4 className={cardHeader}>Répartition formations</h4>
          <div className="h-44">
            <Pie data={pieData} options={getPieOptions()} />
          </div>
        </div>
      </section>

      {/* ══ 3. TABLE ══════════════════════════════════════════════════════════ */}
      <section className={`mt-6 ${card}`}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className={cardHeader}>Récapitulatif des formations</h4>
            <p className={`text-xs ${mutedText} mt-0.5`}>
              {filteredTableData.length} formation{filteredTableData.length > 1 ? "s" : ""} · Cliquer sur un en-tête pour trier
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-foreground">Tri:</span>
            <span className={mutedText}>{sortBy} {sortDir === "asc" ? "↑" : "↓"}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-foreground">
            <thead className={tableHead}>
              <tr>
                {[
                  { label: "Formation", key: "formation" },
                  { label: "Apprenants", key: "learners" },
                  { label: "Taux réussite", key: "success" },
                  { label: "Revenus", key: "revenue" },
                  { label: "Statut", key: "statut" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 cursor-pointer hover:bg-accent/30 transition-colors select-none whitespace-nowrap"
                    onClick={() => handleSort(col.key as keyof TrainingRecord)}
                  >
                    {col.label}{" "}
                    {sortBy === col.key
                      ? sortDir === "asc" ? "↑" : "↓"
                      : <span className="opacity-30">↕</span>
                    }
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={tableDivide}>
              {pagedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-3 py-8 text-center text-sm ${mutedText}`}>
                    Aucune formation ne correspond aux filtres.
                  </td>
                </tr>
              ) : (
                pagedData.map((row, idx) => (
                  <tr key={`${row.formation}-${idx}`} className={tableRow}>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{row.formation}</td>
                    <td className="px-3 py-2">{row.learners}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold
                        ${row.success >= 90
                          ? "bg-success/15 text-success"
                          : row.success >= 80
                            ? "bg-primary/15 text-primary"
                            : "bg-warning/15 text-warning"
                        }`}
                      >
                        {row.success}%
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.revenue.toLocaleString()} DT</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold
                        ${row.statut === "Actif"
                          ? "bg-success/15 text-success"
                          : row.statut === "Terminé"
                            ? "bg-muted text-muted-foreground"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {row.statut}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={`mt-4 flex items-center justify-between text-xs ${mutedText}`}>
          <span>{filteredTableData.length} résultat{filteredTableData.length > 1 ? "s" : ""}</span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-border px-3 py-1.5 hover:bg-accent/20 disabled:opacity-40 transition-colors"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ← Précédent
            </button>
            <span className="font-semibold text-foreground">{page} / {totalPages}</span>
            <button
              className="rounded-md border border-border px-3 py-1.5 hover:bg-accent/20 disabled:opacity-40 transition-colors"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Suivant →
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}