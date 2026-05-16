"use client";

import { useEffect, useState } from "react";
import { AlertResponse, AlertPriority } from "./types/alert.types";
import { fetchAlerts } from "@/lib/financier-alert.api";
import AlertCard from "./components/AlertCard";
import { Loader2, Bell, AlertTriangle, AlertCircle, Info } from "lucide-react";
import DashboardLayout from "@/components/layout/financier/DashboardLayout";

const priorityFilter: { key: AlertPriority | "all"; label: string; color: string }[] = [
  { key: "all", label: "Toutes", color: "bg-gray-800" },
  { key: "critical", label: "Critiques", color: "bg-red-600" },
  { key: "warning", label: "Warnings", color: "bg-orange-500" },
  { key: "info", label: "Infos", color: "bg-blue-500" },
];

export default function AlertsPage() {
  const [data, setData] = useState<AlertResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AlertPriority | "all">("all");

  useEffect(() => {
    fetchAlerts()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const filteredAlerts =
    data?.alerts.filter((a) => (filter === "all" ? true : a.priority === filter)) || [];

  return (
    <DashboardLayout>
        <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sora" style={{ color: "#2d4a3e" }}>
            Centre de Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Surveillance temps réel de la santé financière
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium rounded-xl border transition hover:shadow-sm self-start"
          style={{ background: "#efefea", borderColor: "#e5eadd", color: "#2d4a3e" }}
        >
          Actualiser
        </button>
      </div>

      {/* Stats Cards */}
      {!loading && data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: data.total, icon: Bell, color: "bg-gray-800" },
            { label: "Critiques", value: data.critique, icon: AlertTriangle, color: "bg-red-600" },
            { label: "Warnings", value: data.warning, icon: AlertCircle, color: "bg-orange-500" },
            { label: "Infos", value: data.info, icon: Info, color: "bg-blue-500" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 p-4 rounded-2xl border bg-white"
              style={{ borderColor: "#e5eadd" }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${stat.color}`}>
                <stat.icon size={18} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: "#2d4a3e" }}>
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {!loading && data && (
        <div className="flex flex-wrap gap-2">
          {priorityFilter.map((p) => (
            <button
              key={p.key}
              onClick={() => setFilter(p.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                filter === p.key
                  ? "text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              style={
                filter === p.key
                  ? { background: p.color, borderColor: p.color }
                  : { borderColor: "#e5eadd" }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} className="animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Chargement des alertes...</p>
        </div>
      ) : !data || filteredAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border" style={{ borderColor: "#e5eadd" }}>
          <Bell size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Aucune alerte</h3>
          <p className="text-sm text-gray-500 mt-1">
            {filter !== "all"
              ? "Aucune alerte ne correspond à ce filtre."
              : "Tout va bien, aucun problème détecté."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredAlerts.map((alert, idx) => (
            <AlertCard key={idx} alert={alert} />
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
    
  );
}