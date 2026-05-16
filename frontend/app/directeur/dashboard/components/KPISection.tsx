"use client";

import type { FilterOptions } from "@/context/FilterContext";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
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

type KPIItem = {
  title: string;
  value: string;
  trend: "up" | "down" | "stable";
  delta: string;
  icon: string;
};

/**
 * ✅ RÉVISÉ: TrainingRecord contient maintenant des données réelles API.
 *    - nbSessions   : nombre de sessions planifiées pour la formation
 *    - nbApprenants : apprenants inscrits via sessions (COUNT DISTINCT)
 *    - revenus      : SUM Finance.montant (type=paiement) → session → formation
 *    - tauxReussite : peut être null si aucune performance enregistrée
 */
type TrainingRecord = {
  formation: string;
  nbSessions: number;
  nbApprenants: number;
  revenus: number;
  tauxReussite: number | null;
  statut: "active" | "completed";
};

/**
 * Format Chart.js tel que retourné par le backend.
 */
type ChartPayload = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    tension?: number;
  }[];
};

// Maps human-readable periods to backend-compatible query parameters.
const periodeMap: Record<string, string> = {
  "Ce mois": "month",
  Trimestre: "quarter",
  Semestre: "semester",
  Année: "year",
};

// ─── Fallbacks (affichés si le backend est injoignable) ───────────────────────

const fallbackKpis: KPIItem[] = [
  {
    title: "Apprenants",
    value: "—",
    trend: "stable",
    delta: "Backend offline",
    icon: "👤",
  },
  {
    title: "Chiffre d'affaires",
    value: "—",
    trend: "stable",
    delta: "Backend offline",
    icon: "💶",
  },
  {
    title: "Taux de réussite",
    value: "—",
    trend: "stable",
    delta: "Backend offline",
    icon: "✅",
  },
  {
    title: "Formations actives",
    value: "—",
    trend: "stable",
    delta: "Backend offline",
    icon: "📚",
  },
];

const fallbackChartData: ChartPayload = {
  labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin"],
  datasets: [
    {
      label: "Données indisponibles",
      data: [0, 0, 0, 0, 0, 0],
      backgroundColor: "#e5e7eb",
    },
  ],
};

// ─── Chart options ─────────────────────────────────────────────────────────────

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
  const [loading, setLoading] = useState(true);
  const [showEmpty, setShowEmpty] = useState(false);

  // KPI cards
  const [kpis, setKpis] = useState<KPIItem[]>([]);

  // ✅ RÉVISÉ: tableData est maintenant dynamique (données réelles API)
  const [tableData, setTableData] = useState<TrainingRecord[]>([]);
  const [tableMeta, setTableMeta] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
  });

  // ✅ RÉVISÉ: charts viennent du backend
  const [enrollmentsChart, setEnrollmentsChart] =
    useState<ChartPayload>(fallbackChartData);
  const [revenueChart, setRevenueChart] =
    useState<ChartPayload>(fallbackChartData);
  const [coursesChart, setCoursesChart] =
    useState<ChartPayload>(fallbackChartData);

  // Table state
  const [sortBy, setSortBy] = useState<string>("nbApprenants");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // ── Build query string from filters ───────────────────────────────────────
  const buildParams = useCallback(
    (extra: Record<string, string> = {}) => {
      const params = new URLSearchParams();
      if (filters.periode && filters.periode !== "Tous") {
        const mapped = periodeMap[filters.periode];
        if (mapped) params.append("periode", mapped);
      }
      if (filters.formation && filters.formation !== "Tous")
        params.append("formation", filters.formation);
      if (filters.formateur && filters.formateur !== "Tous")
        params.append("formateur", filters.formateur);
      if (filters.type && filters.type !== "Tous")
        params.append("type", filters.type);
      if (filters.statut && filters.statut !== "Tous") {
        const statutMap: Record<string, string> = {
          Actif: "active",
          Terminé: "completed",
        };
        params.append("statut", statutMap[filters.statut] ?? filters.statut);
      }
      Object.entries(extra).forEach(([k, v]) => params.append(k, v));
      return params.toString() ? `?${params.toString()}` : "";
    },
    [filters],
  );

  // ── Fetch KPIs + Charts (quand les filtres changent) ──────────────────────
  const fetchKpisAndCharts = useCallback(async () => {
    setLoading(true);
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
    const headers: HeadersInit = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    const base = "http://localhost:5000";
    const q = buildParams();

    try {
      // ✅ Fetch parallel: overview + kpis + 3 charts
      const [overviewRes, kpisRes, enrollRes, revRes, coursesRes] =
        await Promise.allSettled([
          fetch(`${base}/dashboard/overview${q}`, { headers }),
          fetch(`${base}/dashboard/kpis${q}`, { headers }),
          fetch(`${base}/dashboard/charts/enrollments${q}`, { headers }),
          fetch(`${base}/dashboard/charts/revenue${q}`, { headers }),
          fetch(`${base}/dashboard/charts/courses${q}`, { headers }),
        ]);

      // ── KPI cards ──────────────────────────────────────────────────────
      const overview =
        overviewRes.status === "fulfilled" && overviewRes.value.ok
          ? await overviewRes.value.json()
          : null;

      const kpiData =
        kpisRes.status === "fulfilled" && kpisRes.value.ok
          ? await kpisRes.value.json()
          : null;

      if (overview && kpiData) {
        setKpis([
          {
            title: "Apprenants",
            value: overview.totalApprenants?.toString() ?? "—",
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
            trend: (kpiData.tauxReussite ?? 0) >= 50 ? "up" : "down",
            delta: "",
            icon: "✅",
          },
          {
            // ✅ RÉVISÉ: formationsActives vient maintenant des sessions réelles
            title: "Formations actives",
            value: kpiData.formationsActives?.toString() ?? "—",
            trend: "stable",
            delta: `/ ${overview.totalFormations ?? 0} total · ${overview.sessionsActives ?? 0} sessions`,
            icon: "📚",
          },
        ]);
      } else {
        setKpis(fallbackKpis);
      }

      // ── Charts ────────────────────────────────────────────────────────
      if (enrollRes.status === "fulfilled" && enrollRes.value.ok) {
        setEnrollmentsChart(await enrollRes.value.json());
      }
      if (revRes.status === "fulfilled" && revRes.value.ok) {
        setRevenueChart(await revRes.value.json());
      }
      if (coursesRes.status === "fulfilled" && coursesRes.value.ok) {
        setCoursesChart(await coursesRes.value.json());
      }
    } catch {
      setKpis(fallbackKpis);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchKpisAndCharts();
  }, [filters, fetchKpisAndCharts]);

  // ✅ Auto-refresh based on directeur's preference in localStorage
  useAutoRefresh(fetchKpisAndCharts, true, "directeur");

  // ── Fetch Table (quand filtres OU tri OU page changent) ───────────────────
  useEffect(() => {
    const fetchTable = async () => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token")
          : null;
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const base = "http://localhost:5000";

      // ✅ RÉVISÉ: les params de tri correspondent aux champs retournés par getTopCourses()
      const q = buildParams({
        page: String(page),
        limit: String(pageSize),
        sortBy,
        sortDir: sortDir.toUpperCase(),
      });

      try {
        const res = await fetch(`${base}/dashboard/top-courses${q}`, {
          headers,
        });
        if (res.ok) {
          const json = await res.json();
          // json = { data: TrainingRecord[], total, page, totalPages }
          setTableData(json.data ?? []);
          setTableMeta({
            total: json.total ?? 0,
            page: json.page ?? 1,
            totalPages: json.totalPages ?? 1,
          });
        }
      } catch {
        // Garde les données déjà chargées si elles existent
      }
    };

    fetchTable();
  }, [filters, sortBy, sortDir, page, buildParams]);

  // Reset page 1 quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // ── Sort handler ───────────────────────────────────────────────────────────
  const handleSort = (field: string) => {
    if (sortBy === field)
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  // ── Filtre côté client (pour les filtres non passés à l'API) ──────────────
  // La table est déjà filtrée côté serveur, useMemo ici sert juste à stabiliser
  const displayData = useMemo(() => tableData, [tableData]);

  // ── Classes ────────────────────────────────────────────────────────────────
  const card =
    "rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow";
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
          {(filters.statut !== "Tous" ||
            filters.formation !== "Tous" ||
            filters.periode !== "Ce mois") && (
            <p className={`text-xs ${mutedText} mt-0.5`}>
              Filtres actifs:{" "}
              {[
                filters.periode !== "Ce mois" && filters.periode,
                filters.formation !== "Tous" && filters.formation,
                filters.statut !== "Tous" && filters.statut,
                filters.type !== "Tous" && filters.type,
                filters.formateur !== "Tous" && filters.formateur,
              ]
                .filter(Boolean)
                .join(" · ")}
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

      {/* ══ 1. KPI CARDS ════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 shadow-sm animate-pulse"
            >
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
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold flex items-center gap-1
                  ${
                    item.trend === "up"
                      ? "bg-success/15 text-success"
                      : item.trend === "down"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.trend === "up"
                    ? "↑"
                    : item.trend === "down"
                      ? "↓"
                      : "→"}{" "}
                  {item.delta}
                </span>
              </div>
              <p className={`mt-3 text-sm ${mutedText}`}>{item.title}</p>
              <p className="text-2xl font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ══ 2. CHARTS ════════════════════════════════════════════════════════ */}
      {/* ✅ RÉVISÉ: données viennent du backend (enrollmentsChart, revenueChart, coursesChart) */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className={card}>
          <h4 className={cardHeader}>Inscriptions par période</h4>
          <p className={`text-xs ${mutedText} mb-2`}>
            Apprenants inscrits en sessions
          </p>
          <div className="h-44">
            <Bar data={enrollmentsChart} options={getChartOptions()} />
          </div>
        </div>
        <div className={card}>
          <h4 className={cardHeader}>Évolution CA</h4>
          <p className={`text-xs ${mutedText} mb-2`}>Paiements enregistrés</p>
          <div className="h-44">
            <Line data={revenueChart} options={getChartOptions()} />
          </div>
        </div>
        <div className={card}>
          {/* ✅ RÉVISÉ: "Top formations" par nbApprenants inscrits (pas prix) */}
          <h4 className={cardHeader}>Top formations</h4>
          <p className={`text-xs ${mutedText} mb-2`}>
            Par nombre d'apprenants inscrits
          </p>
          <div className="h-44">
            <Pie data={coursesChart} options={getPieOptions()} />
          </div>
        </div>
      </section>

      {/* ══ 3. TABLE ══════════════════════════════════════════════════════════ */}
      {/* ✅ RÉVISÉ: données réelles depuis /dashboard/top-courses */}
      <section className={`mt-6 ${card}`}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className={cardHeader}>Récapitulatif des formations</h4>
            <p className={`text-xs ${mutedText} mt-0.5`}>
              {tableMeta.total} formation{tableMeta.total > 1 ? "s" : ""} ·
              Cliquer sur un en-tête pour trier
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-foreground">Tri:</span>
            <span className={mutedText}>
              {sortBy} {sortDir === "asc" ? "↑" : "↓"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-foreground">
            <thead className={tableHead}>
              <tr>
                {[
                  { label: "Formation", key: "formation" },
                  { label: "Sessions", key: "nbSessions" },
                  { label: "Apprenants", key: "nbApprenants" },
                  { label: "Taux réussite", key: "tauxReussite" },
                  { label: "Revenus", key: "revenus" },
                  { label: "Statut", key: "statut" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 cursor-pointer hover:bg-accent/30 transition-colors select-none whitespace-nowrap"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}{" "}
                    {sortBy === col.key ? (
                      sortDir === "asc" ? (
                        "↑"
                      ) : (
                        "↓"
                      )
                    ) : (
                      <span className="opacity-30">↕</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={tableDivide}>
              {displayData.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className={`px-3 py-8 text-center text-sm ${mutedText}`}
                  >
                    {loading
                      ? "Chargement..."
                      : "Aucune formation ne correspond aux filtres."}
                  </td>
                </tr>
              ) : (
                displayData.map((row, idx) => (
                  <tr key={`${row.formation}-${idx}`} className={tableRow}>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      {row.formation}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        {row.nbSessions}
                      </span>
                    </td>
                    <td className="px-3 py-2">{row.nbApprenants}</td>
                    <td className="px-3 py-2">
                      {row.tauxReussite === null ? (
                        <span className={`text-xs ${mutedText}`}>—</span>
                      ) : (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold
                          ${
                            row.tauxReussite >= 90
                              ? "bg-success/15 text-success"
                              : row.tauxReussite >= 80
                                ? "bg-primary/15 text-primary"
                                : "bg-warning/15 text-warning"
                          }`}
                        >
                          {row.tauxReussite}%
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.revenus.toLocaleString()} DT
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold
                        ${
                          row.statut === "active"
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {row.statut === "active" ? "Actif" : "Terminé"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination côté serveur */}
        <div
          className={`mt-4 flex items-center justify-between text-xs ${mutedText}`}
        >
          <span>
            {tableMeta.total} résultat{tableMeta.total > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-border px-3 py-1.5 hover:bg-accent/20 disabled:opacity-40 transition-colors"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ← Précédent
            </button>
            <span className="font-semibold text-foreground">
              {tableMeta.page} / {tableMeta.totalPages}
            </span>
            <button
              className="rounded-md border border-border px-3 py-1.5 hover:bg-accent/20 disabled:opacity-40 transition-colors"
              onClick={() =>
                setPage((p) => Math.min(tableMeta.totalPages, p + 1))
              }
              disabled={page >= tableMeta.totalPages}
            >
              Suivant →
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
