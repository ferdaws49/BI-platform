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

type KPIItem = {
  title: string;
  value: string;
  trend: "up" | "down" | "stable";
  delta: string;
  icon: string;
};

type QualityRecord = {
  formation: string;
  formateur: string;
  satisfaction: number;
  reussite: number;
  abandon: number;
  type: "Présentiel" | "En ligne";
};

// Static quality data
const qualityData: QualityRecord[] = [
  {
    formation: "Data Science",
    formateur: "Amine",
    satisfaction: 92,
    reussite: 92,
    abandon: 8,
    type: "En ligne",
  },
  {
    formation: "Web Dev",
    formateur: "Sara",
    satisfaction: 85,
    reussite: 85,
    abandon: 12,
    type: "Présentiel",
  },
  {
    formation: "UI/UX",
    formateur: "Mohamed",
    satisfaction: 78,
    reussite: 78,
    abandon: 18,
    type: "En ligne",
  },
  {
    formation: "Java",
    formateur: "Amine",
    satisfaction: 94,
    reussite: 90,
    abandon: 5,
    type: "Présentiel",
  },
  {
    formation: "Data Engineering",
    formateur: "Sara",
    satisfaction: 88,
    reussite: 80,
    abandon: 15,
    type: "En ligne",
  },
  {
    formation: "Marketing",
    formateur: "Mohamed",
    satisfaction: 72,
    reussite: 72,
    abandon: 22,
    type: "Présentiel",
  },
];

export default function QualitySection({
  filters,
}: {
  filters: FilterOptions;
}) {
  const [loading, setLoading] = useState(true);
  const [showEmpty, setShowEmpty] = useState(false);
  const [sortBy, setSortBy] = useState<keyof QualityRecord>("satisfaction");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [kpis, setKpis] = useState<KPIItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Calculate quality KPIs from static data
        const avgSatisfaction =
          qualityData.reduce((sum, r) => sum + r.satisfaction, 0) /
          qualityData.length;
        const avgReussite =
          qualityData.reduce((sum, r) => sum + r.reussite, 0) /
          qualityData.length;
        const avgAbandon =
          qualityData.reduce((sum, r) => sum + r.abandon, 0) /
          qualityData.length;
        const scoreQualite = (avgSatisfaction + avgReussite) / 2;

        setKpis([
          {
            title: "Taux de satisfaction moyen",
            value: `${avgSatisfaction.toFixed(0)}%`,
            trend: avgSatisfaction >= 85 ? "up" : "stable",
            delta: "+3% ce mois",
            icon: "😊",
          },
          {
            title: "Taux de réussite global",
            value: `${avgReussite.toFixed(0)}%`,
            trend: avgReussite >= 80 ? "up" : "stable",
            delta: "+2% vs dernier mois",
            icon: "✅",
          },
          {
            title: "Taux d'abandon",
            value: `${avgAbandon.toFixed(0)}%`,
            trend: avgAbandon <= 15 ? "up" : "down",
            delta: "-1% optimisé",
            icon: "📉",
          },
          {
            title: "Score qualité global",
            value: `${scoreQualite.toFixed(0)}/100`,
            trend: scoreQualite >= 80 ? "up" : "stable",
            delta: "Très bon",
            icon: "⭐",
          },
        ]);
      } catch (error) {
        console.error("Error fetching quality data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const filteredTableData = useMemo(() => {
    let records = [...qualityData];
    if (filters.formation !== "Tous")
      records = records.filter((r) => r.formation === filters.formation);
    if (filters.formateur !== "Tous")
      records = records.filter((r) => r.formateur === filters.formateur);
    if (filters.type !== "Tous")
      records = records.filter((r) => r.type === filters.type);

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

  const pageSize = 5;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTableData.length / pageSize),
  );
  const pagedData = filteredTableData.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  // Quality charts
  const satisfactionBarData = {
    labels: ["Data S.", "Web Dev", "UI/UX", "Java", "Data Eng.", "Marketing"],
    datasets: [
      {
        label: "Satisfaction des apprenants (%)",
        data: [92, 85, 78, 94, 88, 72],
        backgroundColor: "#0891b2",
      },
    ],
  };

  const reussiteLineData = {
    labels: ["S1", "S2", "S3", "S4", "S5", "S6"],
    datasets: [
      {
        label: "Taux de réussite",
        data: [78, 80, 82, 85, 87, 85],
        borderColor: "#06b6d4",
        backgroundColor: "rgba(6,182,212,0.2)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const performanceFormateursData = {
    labels: ["Amine", "Sara", "Mohamed", "Fatima", "Ali"],
    datasets: [
      {
        label: "Performance des formateurs (%)",
        data: [92, 88, 75, 85, 80],
        backgroundColor: "#22d3ee",
      },
    ],
  };

  const handleSort = (field: keyof QualityRecord) => {
    if (sortBy === field)
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const getQualityLevel = (score: number) => {
    if (score >= 90) return "🟢 Excellent";
    if (score >= 80) return "🟡 Bon";
    if (score >= 70) return "🟠 Acceptable";
    return "🔴 À améliorer";
  };

  const getAbandonLevel = (abandon: number) => {
    if (abandon <= 5) return "🟢 Très bon";
    if (abandon <= 15) return "🟡 Bon";
    return "🔴 À améliorer";
  };

  return (
    <main className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-cyan-900">
          Qualité Pédagogique
        </h3>
        <button
          className="rounded-lg border border-cyan-200 bg-white px-3 py-1 text-xs text-cyan-800 hover:bg-cyan-50"
          onClick={() => setShowEmpty((prev) => !prev)}
        >
          {showEmpty ? "Réafficher les KPIs" : "Activer état vide"}
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-cyan-100 bg-white p-8 text-center text-sm text-cyan-600 shadow-sm">
          Chargement des données de qualité...
        </div>
      ) : showEmpty ? (
        <div className="rounded-xl border border-dashed border-cyan-300 bg-amber-50 p-8 text-center text-sm text-gray-500">
          Aucune donnée disponible pour la période sélectionnée.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-cyan-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl">{item.icon}</span>
                <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-800">
                  {item.trend === "up"
                    ? "↑"
                    : item.trend === "down"
                      ? "↓"
                      : "→"}{" "}
                  {item.delta}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-500">{item.title}</p>
              <p className="text-2xl font-bold text-cyan-900">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quality Charts */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-cyan-100 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-cyan-900">
            Satisfaction des apprenants par formation
          </h4>
          <div className="h-44">
            <Bar
              data={satisfactionBarData}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-cyan-100 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-cyan-900">
            Évolution du taux de réussite
          </h4>
          <div className="h-44">
            <Line
              data={reussiteLineData}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-cyan-100 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-cyan-900">
            Performance des formateurs
          </h4>
          <div className="h-44">
            <Bar
              data={performanceFormateursData}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>
      </section>

      {/* Quality Table */}
      <section className="mt-6 rounded-xl border border-cyan-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-cyan-900">
            Analyse Qualité Détaillée
          </h4>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-cyan-900">Tri:</span>
            <span className="text-gray-600">
              {sortBy} {sortDir === "asc" ? "↑" : "↓"}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-gray-700">
            <thead className="bg-cyan-50 text-xs uppercase text-gray-500">
              <tr>
                {[
                  { label: "Formation", key: "formation" },
                  { label: "Formateur", key: "formateur" },
                  { label: "Satisfaction", key: "satisfaction" },
                  { label: "Réussite", key: "reussite" },
                  { label: "Abandon", key: "abandon" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 cursor-pointer hover:bg-cyan-100"
                    onClick={() => handleSort(col.key as keyof QualityRecord)}
                  >
                    {col.label}{" "}
                    {sortBy === col.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-gray-500"
                  >
                    Aucune formation ne correspond aux filtres.
                  </td>
                </tr>
              ) : (
                pagedData.map((row, idx) => (
                  <tr
                    key={`${row.formation}-${idx}`}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-3 py-2 font-medium">{row.formation}</td>
                    <td className="px-3 py-2">{row.formateur}</td>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-cyan-700">
                        {row.satisfaction}%
                      </span>
                      <br />
                      <span className="text-xs">
                        {getQualityLevel(row.satisfaction)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-green-700">
                        {row.reussite}%
                      </span>
                      <br />
                      <span className="text-xs">
                        {getQualityLevel(row.reussite)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-red-600">
                        {row.abandon}%
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
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <button
            className="rounded-md border border-cyan-200 px-3 py-1 disabled:opacity-40 hover:bg-cyan-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Précédent
          </button>
          <span>
            Page {page} sur {totalPages}
          </span>
          <button
            className="rounded-md border border-cyan-200 px-3 py-1 disabled:opacity-40 hover:bg-cyan-50"
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
