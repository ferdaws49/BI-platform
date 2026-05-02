"use client";

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

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ── Types ──────────────────────────────────────────────────────────────────
type FilterOptions = {
  periode: string; // 'Ce mois' | 'Trimestre' | 'Semestre' | 'Année'
  formation: string;
  type: string;
  statut: string;
};

type KPIItem = {
  title: string;
  value: string;
  trend: "up" | "down" | "stable";
  delta: string;
  icon: string;
};

type FinancialRecord = {
  formationId: number;
  titre: string;
  formation: string;
  type: string;
  statut: string;
  revenus: number;
  couts: number;
  profit: number;
  marge: number;
};

type OverviewResponse = {
  revenus: number;
  couts: number;
  profit: number;
  marge: number;
  topFormation: { nom: string; profit: number };
  impayes: { count: number; montantTotal: number };
  evolutionCA: { labels: string[]; data: number[] };
};

/**
 * Default empty state for the finance overview.
 */
const EMPTY_OVERVIEW: OverviewResponse = {
  revenus: 0,
  couts: 0,
  profit: 0,
  marge: 0,
  topFormation: { nom: "N/A", profit: 0 },
  impayes: { count: 0, montantTotal: 0 },
  evolutionCA: {
    labels: ["S1", "S2", "S3", "S4", "S5", "S6"],
    data: [0, 0, 0, 0, 0, 0],
  },
};

/**
 * Returns a visual indicator (icon + text) based on the profit margin percentage.
 */
const getMargeIcon = (m: number) =>
  m >= 65 ? "🟢 Excellent" : m >= 60 ? "🟡 Bon" : "🔴 À améliorer";

// ── Composant ──────────────────────────────────────────────────────────────
export default function FinanceSection({
  filters,
}: {
  filters: FilterOptions;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [overview, setOverview] = useState<OverviewResponse>(EMPTY_OVERVIEW);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [kpis, setKpis] = useState<KPIItem[]>([]);
  const [sortBy, setSortBy] = useState<keyof FinancialRecord>("profit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // ── Data Fetching Logic ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("Session expirée. Veuillez vous reconnecter.");
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Normalization: Ensure 'Année' is sent as 'Annee' to the backend to avoid encoding issues with accents
      const periodeToSend =
        filters.periode === "Année" ? "Annee" : filters.periode;

      const params = new URLSearchParams({
        periode: periodeToSend || "Ce mois",
        formation: filters.formation || "Tous",
        type: filters.type || "Tous",
        statut: filters.statut || "Tous",
      });

      try {
        // Parallel requests for summary statistics and the detailed profitability table
        const [ovRes, tableRes] = await Promise.all([
          fetch(`${API}/directeur/finance/overview?${params}`, { headers }),
          fetch(`${API}/directeur/finance/formations-profitability?${params}`, {
            headers,
          }),
        ]);

        if (!ovRes.ok) {
          const errText = await ovRes.text();
          console.error("Overview error:", ovRes.status, errText);
          throw new Error(`Overview API ${ovRes.status}`);
        }
        if (!tableRes.ok) {
          const errText = await tableRes.text();
          console.error("Profitability error:", tableRes.status, errText);
          throw new Error(`Profitability API ${tableRes.status}`);
        }

        const [ovData, tableData]: [OverviewResponse, FinancialRecord[]] =
          await Promise.all([ovRes.json(), tableRes.json()]);

        setOverview(ovData);
        // Normalize table data (handling different possible title fields)
        setRecords(
          tableData.map((r) => ({
            ...r,
            formation: r.titre ?? r.formation ?? "N/A",
          })),
        );
        setPage(1); // Reset to first page when data changes
      } catch (err) {
        console.error("Finance fetch error:", err);
        setError("Impossible de charger les données finance.");
        setOverview(EMPTY_OVERVIEW);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [filters]);

  // ── Financial KPI Transformation ──────────────────────────────────────────
  // Converts raw overview data into the standard KPIItem format for card display
  useEffect(() => {
    setKpis([
      {
        title: "Revenus totaux",
        value: `${overview.revenus.toLocaleString()} DT`,
        trend: "up",
        delta: `${overview.marge.toFixed(1)}% marge`,
        icon: "💰",
      },
      {
        title: "Coûts totaux",
        value: `${overview.couts.toLocaleString()} DT`,
        trend: "stable",
        // Calculates what percentage of total revenue is consumed by costs
        delta: `${
          overview.revenus > 0
            ? ((overview.couts / overview.revenus) * 100).toFixed(1)
            : 0
        }% des revenus`,
        icon: "💸",
      },
      {
        title: "Profit global",
        value: `${overview.profit.toLocaleString()} DT`,
        // Shows if the organization is profitable or in deficit
        trend: overview.profit > 0 ? "up" : "down",
        delta: `${overview.marge.toFixed(1)}% marge nette`,
        icon: "📈",
      },
      {
        title: "Formation rentable",
        value: overview.topFormation?.nom ?? "N/A",
        trend: "up",
        delta: `+${Number(overview.topFormation?.profit ?? 0).toLocaleString()} DT`,
        icon: "🏆",
      },
    ]);
  }, [overview]);

  // ── Tri local ─────────────────────────────────────────────────────────────
  const sortedData = useMemo(() => {
    return [...records].sort((a, b) => {
      const av = a[sortBy],
        bv = b[sortBy];
      if (typeof av === "number" && typeof bv === "number")
        return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [records, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const pagedData = sortedData.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field: keyof FinancialRecord) => {
    if (sortBy === field) setSortDir((p) => (p === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const avgProfit =
    records.reduce((s, r) => s + r.profit, 0) / (records.length || 1);
  const getProfitTrend = (p: number) =>
    p > avgProfit * 1.2 ? "↑ Excellent" : p > avgProfit ? "→ Bon" : "↓ Faible";

  // ── Charts ────────────────────────────────────────────────────────────────
  const lineData = {
    labels: overview.evolutionCA.labels,
    datasets: [
      {
        label: "Chiffre d'affaires",
        data: overview.evolutionCA.data,
        borderColor: "#059669",
        backgroundColor: "rgba(5,150,105,0.2)",
        tension: 0.3,
      },
    ],
  };

  const barData = {
    labels: sortedData.map((r) => r.formation),
    datasets: [
      {
        label: "Revenus",
        data: sortedData.map((r) => r.revenus),
        backgroundColor: "#10b981",
      },
      {
        label: "Coûts",
        data: sortedData.map((r) => r.couts),
        backgroundColor: "#f87171",
      },
    ],
  };

  const totalRev = sortedData.reduce((s, r) => s + r.revenus, 0) || 1;
  const pieData = {
    labels: sortedData.map((r) => r.formation),
    datasets: [
      {
        data: sortedData.map((r) =>
          Number(((r.revenus / totalRev) * 100).toFixed(1)),
        ),
        backgroundColor: [
          "#10b981",
          "#34d399",
          "#6ee7b7",
          "#a7f3d0",
          "#d1fae5",
          "#ecfdf5",
        ],
      },
    ],
  };

  const chartOptions = { responsive: true, maintainAspectRatio: false };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-green-900">
          Analyse Financière
        </h3>
        {overview.impayes?.count > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            ⚠ {overview.impayes.count} impayé(s) —{" "}
            {overview.impayes.montantTotal.toLocaleString()} DT
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-green-100 bg-white shadow-sm"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl">{item.icon}</span>
                <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-800">
                  {item.trend === "up"
                    ? "↑"
                    : item.trend === "down"
                      ? "↓"
                      : "→"}{" "}
                  {item.delta}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-500">{item.title}</p>
              <p className="text-2xl font-bold text-green-900">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-green-900">
            Évolution Chiffre d'affaires
          </h4>
          <div className="h-44">
            <Line data={lineData} options={chartOptions} />
          </div>
        </div>
        <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-green-900">
            Revenus vs Coûts par Formation
          </h4>
          <div className="h-44">
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
        <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-green-900">
            Répartition des Revenus
          </h4>
          <div className="h-44">
            {sortedData.length > 0 ? (
              <Pie data={pieData} options={chartOptions} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                Aucune donnée
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="mt-6 rounded-xl border border-green-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-green-900">
            Analyse Financière Détaillée
          </h4>
          <span className="text-xs text-gray-500">
            Tri: <strong>{String(sortBy)}</strong>{" "}
            {sortDir === "asc" ? "↑" : "↓"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-gray-700">
            <thead className="bg-green-50 text-xs uppercase text-gray-500">
              <tr>
                {(
                  ["formation", "revenus", "couts", "profit", "marge"] as const
                ).map((col) => (
                  <th
                    key={col}
                    className="cursor-pointer px-3 py-2 capitalize hover:bg-green-100"
                    onClick={() => handleSort(col)}
                  >
                    {col === "marge"
                      ? "Marge %"
                      : col.charAt(0).toUpperCase() + col.slice(1)}{" "}
                    {sortBy === col ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Chargement...
                  </td>
                </tr>
              ) : pagedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-gray-400"
                  >
                    Aucune donnée pour cette période.
                  </td>
                </tr>
              ) : (
                pagedData.map((row, idx) => (
                  <tr
                    key={row.formationId}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-3 py-2 font-medium">{row.formation}</td>
                    <td className="px-3 py-2 font-semibold text-green-700">
                      {row.revenus.toLocaleString()} DT
                    </td>
                    <td className="px-3 py-2 font-semibold text-red-600">
                      {row.couts.toLocaleString()} DT
                    </td>
                    <td className="px-3 py-2 font-bold text-blue-700">
                      {row.profit.toLocaleString()} DT{" "}
                      <span className="text-xs font-normal text-gray-500">
                        {getProfitTrend(row.profit)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span>{row.marge.toFixed(1)}%</span>
                      <br />
                      <span className="text-xs">{getMargeIcon(row.marge)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <button
            className="rounded-md border border-green-200 px-3 py-1 hover:bg-green-50 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Précédent
          </button>
          <span>
            Page {page} sur {totalPages}
          </span>
          <button
            className="rounded-md border border-green-200 px-3 py-1 hover:bg-green-50 disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Suivant
          </button>
        </div>
      </section>
    </main>
  );
}
