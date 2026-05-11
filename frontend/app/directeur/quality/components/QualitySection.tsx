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
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
);

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type KPIItem = {
  title: string;
  value: string;
  trend: "up" | "down" | "stable";
  delta: string;
  icon: string;
};

type QualityRecord = {
  formationId: number;
  formation: string;
  formateur: string;
  satisfaction: number;
  reussite: number;
  abandon: number;
  type: string;
};

type QualityOverviewResponse = {
  avgSatisfaction: number;
  avgReussite: number;
  avgAbandon: number;
  scoreQualite: number;
  evolutionReussite: {
    labels: string[];
    data: number[];
  };
};

type FormateurPerformanceResponse = {
  formateur: string;
  score: number;
};

type FormateurPerformanceApiItem = Partial<FormateurPerformanceResponse> & {
  nom?: string;
  name?: string;
  scoreEfficacite?: number;
  performance?: number;
  valeur?: number;
};

const EMPTY_OVERVIEW: QualityOverviewResponse = {
  avgSatisfaction: 0,
  avgReussite: 0,
  avgAbandon: 0,
  scoreQualite: 0,
  evolutionReussite: {
    labels: ["S1", "S2", "S3", "S4", "S5", "S6"],
    data: [0, 0, 0, 0, 0, 0],
  },
};

const mapPeriodeForApi = (periode?: string) => {
  switch (periode) {
    case "Trimestre":
      return "Trimestre";
    case "Semestre":
      return "Semestre";
    case "Année":
      return "Année";
    case "Annee":
      return "Annee";
    case "Ce mois":
    default:
      return "Ce mois";
  }
};

const buildQualityParams = (filters: FilterOptions) => {
  const params = new URLSearchParams();

  if (filters.periode && filters.periode !== "Ce mois") {
    params.append("periode", mapPeriodeForApi(filters.periode));
  }
  if (filters.formation && filters.formation !== "Tous") {
    params.append("formation", filters.formation);
  }
  if (filters.formateur && filters.formateur !== "Tous") {
    params.append("formateur", filters.formateur);
  }
  if (filters.type && filters.type !== "Tous") {
    params.append("type", filters.type);
  }

  return params.toString();
};

const normalizeFormateurPerformance = (
  payload: unknown,
): FormateurPerformanceResponse[] => {
  const source = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        "data" in payload &&
        Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : payload &&
          typeof payload === "object" &&
          "formateurs" in payload &&
          Array.isArray((payload as { formateurs?: unknown }).formateurs)
        ? (payload as { formateurs: unknown[] }).formateurs
        : [];

  return source
    .map((item) => {
      const row = item as FormateurPerformanceApiItem;
      const formateur = row.formateur ?? row.nom ?? row.name ?? "";
      const rawScore =
        row.score ?? row.scoreEfficacite ?? row.performance ?? row.valeur;
      const score = typeof rawScore === "number" ? rawScore : Number(rawScore);

      if (!formateur || Number.isNaN(score)) {
        return null;
      }

      return { formateur, score };
    })
    .filter((row): row is FormateurPerformanceResponse => row !== null);
};

const getTrend = (
  value: number,
  goodThreshold: number,
  warnThreshold: number,
  inverse = false,
): "up" | "down" | "stable" => {
  if (inverse) {
    if (value <= goodThreshold) return "up";
    if (value >= warnThreshold) return "down";
    return "stable";
  }

  if (value >= goodThreshold) return "up";
  if (value <= warnThreshold) return "down";
  return "stable";
};

export default function QualitySection({
  filters,
}: {
  filters: FilterOptions;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<keyof QualityRecord>("satisfaction");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [overview, setOverview] =
    useState<QualityOverviewResponse>(EMPTY_OVERVIEW);
  const [records, setRecords] = useState<QualityRecord[]>([]);
  const [formateurPerformance, setFormateurPerformance] = useState<
    FormateurPerformanceResponse[]
  >([]);

  const card =
    "rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md";
  const cardHeader = "mb-3 text-sm font-semibold text-foreground";
  const mutedText = "text-muted-foreground";
  const tableHead = "bg-muted text-xs uppercase text-muted-foreground";

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
      const query = buildQualityParams(filters);
      const queryPart = query ? `?${query}` : "";

      try {
        const [overviewRes, formationsRes, formateursRes] = await Promise.all([
          fetch(`${API}/directeur/quality/overview${queryPart}`, {
            headers,
          }),
          fetch(`${API}/directeur/quality/formations${queryPart}`, {
            headers,
          }),
          fetch(`${API}/directeur/quality/formateurs-performance${queryPart}`, {
            headers,
          }),
        ]);

        if (!overviewRes.ok) {
          throw new Error(`Overview API ${overviewRes.status}`);
        }
        if (!formationsRes.ok) {
          throw new Error(`Formations API ${formationsRes.status}`);
        }
        if (!formateursRes.ok) {
          throw new Error(`Formateurs API ${formateursRes.status}`);
        }

        const [overviewData, formationsData, rawFormateursData]: [
          QualityOverviewResponse,
          QualityRecord[],
          unknown,
        ] = await Promise.all([
          overviewRes.json(),
          formationsRes.json(),
          formateursRes.json(),
        ]);

        setOverview(overviewData);
        setRecords(formationsData);
        setFormateurPerformance(normalizeFormateurPerformance(rawFormateursData));
        setPage(1);
      } catch (err) {
        console.error("Quality fetch error:", err);
        setError("Impossible de charger les données qualité.");
        setOverview(EMPTY_OVERVIEW);
        setRecords([]);
        setFormateurPerformance([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [filters]);

  const kpis = useMemo<KPIItem[]>(
    () => [
      {
        title: "Taux de satisfaction moyen",
        value: `${overview.avgSatisfaction.toFixed(1)}%`,
        trend: getTrend(overview.avgSatisfaction, 85, 70),
        delta:
          overview.avgSatisfaction >= 85
            ? "Très bon niveau"
            : overview.avgSatisfaction >= 70
              ? "Niveau correct"
              : "À améliorer",
        icon: "😊",
      },
      {
        title: "Taux de réussite global",
        value: `${overview.avgReussite.toFixed(1)}%`,
        trend: getTrend(overview.avgReussite, 80, 65),
        delta:
          overview.avgReussite >= 80
            ? "Bonne réussite"
            : overview.avgReussite >= 65
              ? "Résultat stable"
              : "Sous l'objectif",
        icon: "✅",
      },
      {
        title: "Taux d'abandon",
        value: `${overview.avgAbandon.toFixed(1)}%`,
        trend: getTrend(overview.avgAbandon, 10, 20, true),
        delta:
          overview.avgAbandon <= 10
            ? "Très faible"
            : overview.avgAbandon <= 20
              ? "À surveiller"
              : "Élevé",
        icon: "📉",
      },
      {
        title: "Score qualité global",
        value: `${overview.scoreQualite.toFixed(1)}/100`,
        trend: getTrend(overview.scoreQualite, 80, 65),
        delta:
          overview.scoreQualite >= 80
            ? "Très bon"
            : overview.scoreQualite >= 65
              ? "Correct"
              : "À renforcer",
        icon: "⭐",
      },
    ],
    [overview],
  );

  const sortedData = useMemo(() => {
    return [...records].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDir === "asc" ? aValue - bValue : bValue - aValue;
      }

      return sortDir === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [records, sortBy, sortDir]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const pagedData = sortedData.slice((page - 1) * pageSize, page * pageSize);

  const satisfactionBarData = {
    labels: sortedData.map((row) => row.formation),
    datasets: [
      {
        label: "Satisfaction des apprenants (%)",
        data: sortedData.map((row) => row.satisfaction),
        backgroundColor: "hsl(150 25% 25%)",
      },
    ],
  };

  const reussiteLineData = {
    labels: overview.evolutionReussite.labels,
    datasets: [
      {
        label: "Taux de réussite",
        data: overview.evolutionReussite.data,
        borderColor: "hsl(150 30% 30%)",
        backgroundColor: "hsla(150, 30%, 30%, 0.16)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const performanceFormateursData = {
    labels: formateurPerformance.map((row) => row.formateur),
    datasets: [
      {
        label: "Performance des formateurs (%)",
        data: formateurPerformance.map((row) => row.score),
        backgroundColor: "hsl(150 35% 40%)",
      },
    ],
  };

  const handleSort = (field: keyof QualityRecord) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const getQualityLevel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Bon";
    if (score >= 70) return "Acceptable";
    return "À améliorer";
  };

  const getAbandonLevel = (abandon: number) => {
    if (abandon <= 5) return "Très bon";
    if (abandon <= 15) return "Bon";
    return "À améliorer";
  };

  const chartOptions = { responsive: true, maintainAspectRatio: false };

  return (
    <main className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Qualité pédagogique
        </h3>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-border bg-card shadow-sm" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <div key={item.title} className={card}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl">{item.icon}</span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
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

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className={card}>
          <h4 className={cardHeader}>
            Satisfaction des apprenants par formation
          </h4>
          <div className="h-44">
            {sortedData.length > 0 ? (
              <Bar data={satisfactionBarData} options={chartOptions} />
            ) : (
              <div className={`flex h-full items-center justify-center text-sm ${mutedText}`}>
                Aucune donnée
              </div>
            )}
          </div>
        </div>
        <div className={card}>
          <h4 className={cardHeader}>Évolution du taux de réussite</h4>
          <div className="h-44">
            <Line data={reussiteLineData} options={chartOptions} />
          </div>
        </div>
        <div className={card}>
          <h4 className={cardHeader}>Performance des formateurs</h4>
          <div className="h-44">
            {formateurPerformance.length > 0 ? (
              <Bar data={performanceFormateursData} options={chartOptions} />
            ) : (
              <div className={`flex h-full items-center justify-center text-sm ${mutedText}`}>
                Aucune donnée
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">
            Analyse qualité détaillée
          </h4>
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
                  { label: "Formateur", key: "formateur" },
                  { label: "Type", key: "type" },
                  { label: "Satisfaction", key: "satisfaction" },
                  { label: "Réussite", key: "reussite" },
                  { label: "Abandon", key: "abandon" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="cursor-pointer px-3 py-2 transition-colors hover:bg-accent/30"
                    onClick={() => handleSort(col.key as keyof QualityRecord)}
                  >
                    {col.label}{" "}
                    {sortBy === col.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={`px-3 py-4 text-center ${mutedText}`}>
                    Chargement...
                  </td>
                </tr>
              ) : pagedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`px-3 py-4 text-center ${mutedText}`}>
                    Aucune formation ne correspond aux filtres.
                  </td>
                </tr>
              ) : (
                pagedData.map((row, idx) => (
                  <tr
                    key={row.formationId}
                    className={`${idx % 2 === 0 ? "bg-card" : "bg-muted/30"} transition-colors hover:bg-accent/20`}
                  >
                    <td className="px-3 py-2 font-medium">{row.formation}</td>
                    <td className="px-3 py-2">{row.formateur}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-primary">
                        {row.satisfaction.toFixed(1)}%
                      </span>
                      <br />
                      <span className="text-xs">
                        {getQualityLevel(row.satisfaction)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-success">
                        {row.reussite.toFixed(1)}%
                      </span>
                      <br />
                      <span className="text-xs">
                        {getQualityLevel(row.reussite)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-destructive">
                        {row.abandon.toFixed(1)}%
                      </span>
                      <br />
                      <span className="text-xs">
                        {getAbandonLevel(row.abandon)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={`mt-4 flex items-center justify-between text-sm ${mutedText}`}>
          <button
            className="rounded-md border border-border px-3 py-1 transition-colors hover:bg-accent/20 disabled:opacity-40"
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            disabled={page <= 1}
          >
            Précédent
          </button>
          <span>
            Page {page} sur {totalPages}
          </span>
          <button
            className="rounded-md border border-border px-3 py-1 transition-colors hover:bg-accent/20 disabled:opacity-40"
            onClick={() =>
              setPage((currentPage) => Math.min(totalPages, currentPage + 1))
            }
            disabled={page >= totalPages}
          >
            Suivant
          </button>
        </div>
      </section>
    </main>
  );
}
