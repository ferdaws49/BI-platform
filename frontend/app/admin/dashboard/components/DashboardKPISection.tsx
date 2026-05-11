"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Minus,
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
  Legend
);

// ─── Static fallback data ───────────────────────────────────────────────
const staticKpis = {
  utilisateursActifs: 47,
  donneesImportees: 2341,
  demandesEnAttente: 5,
  erreursSysteme: 3,
};

const staticActivity = [
  { jour: "Lun", connexions: 32, imports: 8 },
  { jour: "Mar", connexions: 41, imports: 12 },
  { jour: "Mer", connexions: 55, imports: 18 },
  { jour: "Jeu", connexions: 38, imports: 10 },
  { jour: "Ven", connexions: 62, imports: 22 },
  { jour: "Sam", connexions: 28, imports: 6 },
  { jour: "Dim", connexions: 47, imports: 15 },
];

const staticServices = [
  { nom: "PostgreSQL", latence: "12ms", statut: "ok" },
  { nom: "NestJS Backend", latence: "8ms", statut: "ok" },
  { nom: "Redis Cache", latence: "45ms", statut: "warn" },
  { nom: "Supabase Auth", latence: "22ms", statut: "ok" },
  { nom: "Email Service", latence: "—", statut: "down" },
];

// ─── Chart configuration ────────────────────────────────────────────────
/**
 * Configuration options for the administrative activity chart.
 * Focuses on clarity and clean visual presentation.
 */
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
  interaction: {
    mode: "index" as const,
    intersect: false,
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: { size: 11 },
        color: "#9ca3af",
      },
      border: {
        display: false,
      },
    },
    y: {
      grid: {
        color: "#f3f4f6",
      },
      ticks: {
        font: { size: 11 },
        color: "#9ca3af",
        padding: 10,
      },
      border: {
        display: false,
        dash: [4, 4],
      },
    },
  },
  elements: {
    line: {
      tension: 0.4, // Smooth curved lines
    },
    point: {
      radius: 0,
      hitRadius: 10,
      hoverRadius: 4,
    },
  },
};

// ─── Sub-components ─────────────────────────────────────────────────────
/**
 * KPI Card for administrative metrics.
 */
function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  trend: string;
  trendUp?: boolean;
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
      <p
        className={`text-xs font-medium ${
          trendUp === undefined
            ? "text-amber-600"
            : trendUp
            ? "text-emerald-600"
            : "text-red-500"
        }`}
      >
        {trend}
      </p>
    </div>
  );
}

/**
 * Row for the service status monitor.
 */
function ServiceRow({
  nom,
  latence,
  statut,
}: {
  nom: string;
  latence: string;
  statut: string;
}) {
  const icon =
    statut === "ok" ? (
      <CheckCircle size={15} className="text-emerald-500" />
    ) : statut === "warn" ? (
      <Minus size={15} className="text-amber-500" />
    ) : (
      <XCircle size={15} className="text-red-500" />
    );

  const badge =
    statut === "ok" ? (
      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        OK
      </span>
    ) : statut === "warn" ? (
      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
        Lent
      </span>
    ) : (
      <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
        Hors ligne
      </span>
    );

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      {icon}
      <span className="flex-1 text-sm text-gray-700 font-medium">{nom}</span>
      <span className="text-xs text-gray-400 font-mono">{latence}</span>
      {badge}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────
export default function DashboardKPISection() {
  const [kpis, setKpis] = useState(staticKpis);
  const [activity, setActivity] = useState(staticActivity);
  const [services, setServices] = useState(staticServices);
  const [loading, setLoading] = useState(true);

  // ── Data Fetching Logic ──
  const fetchDashboardData = async () => {
    const token = localStorage.getItem("access_token");
    
    return Promise.allSettled([
      fetch("http://localhost:5000/admin/kpis", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("http://localhost:5000/admin/activity", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("http://localhost:5000/admin/services", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]).then(async ([kpisRes, activityRes, servicesRes]) => {
      if (kpisRes.status === "fulfilled" && kpisRes.value.ok)
        setKpis(await kpisRes.value.json());
      if (activityRes.status === "fulfilled" && activityRes.value.ok)
        setActivity(await activityRes.value.json());
      if (servicesRes.status === "fulfilled" && servicesRes.value.ok)
        setServices(await servicesRes.value.json());
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ✅ Activer l'auto-refresh basé sur les paramètres (Préférences)
  useAutoRefresh(fetchDashboardData);

  const chartData = {
    labels: activity.map((a) => a.jour),
    datasets: [
      {
        label: "Connexions",
        data: activity.map((a) => a.connexions),
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

  if (loading)
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-32 border border-gray-100" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-2xl h-64 border border-gray-100" />
          <div className="bg-white rounded-2xl h-64 border border-gray-100" />
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label="Utilisateurs actifs"
          value={kpis.utilisateursActifs}
          trend="▲ +12% ce mois"
          trendUp={true}
          color="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          icon={Database}
          label="Données importées"
          value={kpis.donneesImportees.toLocaleString("fr-FR")}
          trend="▲ +8% cette semaine"
          trendUp={true}
          color="bg-blue-50 text-blue-600"
        />
        <KpiCard
          icon={Clock}
          label="Demandes en attente"
          value={kpis.demandesEnAttente}
          trend="● Traitement requis"
          color="bg-amber-50 text-amber-600"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Erreurs système"
          value={kpis.erreursSysteme}
          trend="▼ +3 depuis hier"
          trendUp={false}
          color="bg-red-50 text-red-500"
        />
      </div>

      {/* Chart + Services */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Area Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">
            Activité — 7 derniers jours
          </h2>
          <p className="text-xs text-gray-400 mb-4">Connexions & imports par jour</p>
          <div style={{ width: "100%", height: 200 }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Services Monitor */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Statut des services</h2>
          <p className="text-xs text-gray-400 mb-4">Temps réel</p>
          <div>
            {services.map((s) => (
              <ServiceRow key={s.nom} {...s} />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Dernière vérification: il y a 2 min
          </p>
        </div>
      </div>
    </div>
  );
}