"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Database,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  PhoneOff,
  CalendarX,
  GraduationCap,
  Activity,
  RefreshCw,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  ScriptableContext,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
);

// ─── Types ────────────────────────────────────────────────────────────────
interface KpiData {
  utilisateursActifs: number;
  donneesImportees: number;
  demandesEnAttente: number;
  sessionsActives: number;
}

interface ActivityData {
  jour: string;
  utilisateursActifs: number; // ✅ renommé (plus "connexions")
  imports: number;
}

interface AlertItem {
  type: "error" | "warning";
  title: string;
  message: string;
}

interface DataQuality {
  formateursSansSessions: number;
  apprenantsSansTelephone: number;
  sessionsSansFormateur: number;
}

// ─── Chart configuration ─────────────────────────────────────────────────
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: {
        font: { size: 12, family: "'Inter', sans-serif" },
        usePointStyle: true,
        boxWidth: 8,
        padding: 20,
      },
    },
    tooltip: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      titleColor: "#1f2937",
      bodyColor: "#4b5563",
      borderColor: "#e5e7eb",
      borderWidth: 1,
      padding: 10,
      boxPadding: 4,
      usePointStyle: true,
    },
  },
  interaction: { mode: "index" as const, intersect: false },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 }, color: "#9ca3af" },
      border: { display: false },
    },
    y: {
      grid: { color: "#f3f4f6" },
      ticks: { font: { size: 11 }, color: "#9ca3af", padding: 10 },
      border: { display: false, dash: [4, 4] },
    },
  },
  elements: {
    line: { tension: 0.4 },
    point: { radius: 0, hitRadius: 10, hoverRadius: 4 },
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <div className={`p-2 rounded-xl ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function AlertCard({ alert }: { alert: AlertItem }) {
  const isError = alert.type === "error";
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${
        isError
          ? "bg-red-50 border-red-200 text-red-800"
          : "bg-amber-50 border-amber-200 text-amber-800"
      }`}
    >
      {isError ? (
        <XCircle size={18} className="mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      )}
      <div>
        <p className="font-semibold text-sm">{alert.title}</p>
        <p className="text-sm opacity-90 mt-0.5">{alert.message}</p>
      </div>
    </div>
  );
}

function QualityItem({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${color}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span
        className={`text-xl font-bold ${value > 0 ? "text-red-600" : "text-emerald-600"}`}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-8 text-center">
      <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
export default function DashboardKPISection() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [activity, setActivity] = useState<ActivityData[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ✅ useCallback pour que useAutoRefresh ne re-crée pas le timer à chaque render
  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [kpisRes, activityRes, alertsRes, qualityRes] = await Promise.all([
        fetch("http://localhost:5000/admin/kpis", { headers }),
        fetch("http://localhost:5000/admin/activity", { headers }),
        fetch("http://localhost:5000/admin/alerts", { headers }),
        fetch("http://localhost:5000/admin/data-quality", { headers }),
      ]);

      if (kpisRes.ok) setKpis(await kpisRes.json());
      if (activityRes.ok) setActivity(await activityRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (qualityRes.ok) setDataQuality(await qualityRes.json());

      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✅ Auto-refresh based on user preference in localStorage
  useAutoRefresh(fetchData, true, "admin");

  const chartData = {
    labels: activity.map((a) => a.jour),
    datasets: [
      {
        label: "Utilisateurs actifs", // ✅ renommé
        data: activity.map((a) => a.utilisateursActifs),
        borderColor: "#10b981",
        backgroundColor: (context: ScriptableContext<"line">) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, "rgba(16, 185, 129, 0.15)");
          gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
          return gradient;
        },
        borderWidth: 2,
        fill: true,
      },
      {
        label: "Imports",
        data: activity.map((a) => a.imports),
        borderColor: "#3b82f6",
        backgroundColor: (context: ScriptableContext<"line">) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, "rgba(59, 130, 246, 0.15)");
          gradient.addColorStop(1, "rgba(59, 130, 246, 0)");
          return gradient;
        },
        borderWidth: 2,
        fill: true,
      },
    ],
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl h-32 border border-gray-100"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl h-24 border border-gray-100"
            />
          ))}
        </div>
        <div className="bg-white rounded-2xl h-64 border border-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-2xl border border-red-200 p-8 text-center">
        <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-800">{error}</h3>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── KPI Cards ───────────────────────────────────────────────── */}
      {kpis ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            icon={Users}
            label="Utilisateurs actifs"
            value={kpis.utilisateursActifs}
            color="bg-emerald-50 text-emerald-600"
          />
          <KpiCard
            icon={Database}
            label="Données importées"
            value={kpis.donneesImportees.toLocaleString("fr-FR")}
            color="bg-blue-50 text-blue-600"
          />
          <KpiCard
            icon={Clock}
            label="Demandes en attente"
            value={kpis.demandesEnAttente}
            color="bg-amber-50 text-amber-600"
          />
          <KpiCard
            icon={CheckCircle}
            label="Sessions actives"
            value={kpis.sessionsActives}
            color="bg-purple-50 text-purple-600"
          />
        </div>
      ) : (
        <EmptyState message="Aucune donnée KPI disponible" />
      )}

      {/* ─── Alerts ──────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            Alertes actives
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((alert, idx) => (
              <AlertCard key={idx} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Data Quality ────────────────────────────────────────────── */}
      {dataQuality ? (
        <div>
          <h2 className="text-sm font-semibold text-gray-800 mb-3">
            Qualité des données
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QualityItem
              label="Formateurs sans sessions"
              value={dataQuality.formateursSansSessions}
              icon={GraduationCap}
              color="bg-orange-50 text-orange-600"
            />
            <QualityItem
              label="Apprenants sans téléphone"
              value={dataQuality.apprenantsSansTelephone}
              icon={PhoneOff}
              color="bg-red-50 text-red-600"
            />
            <QualityItem
              label="Sessions sans formateur"
              value={dataQuality.sessionsSansFormateur}
              icon={CalendarX}
              color="bg-rose-50 text-rose-600"
            />
          </div>
        </div>
      ) : (
        <EmptyState message="Aucune donnée de qualité disponible" />
      )}

      {/* ─── Activity Chart ──────────────────────────────────────────── */}
      {activity.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">
            Activité — 7 derniers jours
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Utilisateurs actifs & imports par jour
          </p>
          <div style={{ width: "100%", height: 220 }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      ) : (
        <EmptyState message="Aucune donnée d'activité disponible" />
      )}
    </div>
  );
}
