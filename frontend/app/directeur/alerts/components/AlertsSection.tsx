"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AlertFilterOptions,
  AlertSeverity,
  AlertStatus,
} from "@/app/directeur/alerts/components/alertTypes";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type Alert = {
  id: string;
  type: AlertSeverity;
  titre: string;
  description: string;
  formation: string;
  date: string;
  priorite: number;
  statut: AlertStatus;
  details?: string;
};

type ApiAlert = {
  id: string;
  type: "finance" | "session" | "payment";
  priority: "critical" | "warning" | "info";
  title: string;
  message: string;
  action: string;
  value: number;
  createdAt: string;
  viewed: boolean;
  treated: boolean;
};

type AlertsApiResponse = {
  total: number;
  critique: number;
  warning: number;
  info: number;
  alerts: ApiAlert[];
};

function toSeverity(priority: ApiAlert["priority"]): AlertSeverity {
  if (priority === "critical") return "Critique";
  if (priority === "warning") return "Avertissement";
  return "Information";
}

function toTypeLabel(type: ApiAlert["type"]): string {
  if (type === "finance") return "Finance";
  if (type === "session") return "Session";
  return "Paiement";
}

function toPriorityScore(priority: ApiAlert["priority"]): number {
  if (priority === "critical") return 9;
  if (priority === "warning") return 6;
  return 3;
}

function buildDateFilters(period: AlertFilterOptions["periode"]): {
  startDate?: string;
  endDate?: string;
} {
  if (period === "Tous") return {};

  const end = new Date();
  const start = new Date(end);

  if (period === "24 dernières heures") {
    start.setDate(end.getDate() - 1);
  } else if (period === "7 derniers jours") {
    start.setDate(end.getDate() - 7);
  } else {
    start.setDate(end.getDate() - 30);
  }

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

function mapApiAlert(alert: ApiAlert): Alert {
  return {
    id: alert.id,
    type: toSeverity(alert.priority),
    titre: alert.title,
    description: alert.message,
    formation: toTypeLabel(alert.type),
    date: alert.createdAt,
    priorite: toPriorityScore(alert.priority),
    statut: alert.treated ? "Traité" : "Non traité",
    details: alert.action,
  };
}

export default function AlertsSection({
  filters,
  onFiltersChange,
}: {
  filters: AlertFilterOptions;
  onFiltersChange: (filters: AlertFilterOptions) => void;
}) {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("access_token");
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const query = new URLSearchParams(buildDateFilters(filters.periode));
        const res = await fetch(`${API}/directeur/alerts?${query.toString()}`, {
          headers,
        });

        if (!res.ok) {
          throw new Error(`Alerts API ${res.status}`);
        }

        const data: AlertsApiResponse = await res.json();
        setAlerts(data.alerts.map(mapApiAlert));
      } catch (err) {
        console.error("Alerts fetch error:", err);
        setError("Impossible de charger les alertes.");
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [filters.periode]);

  const filteredAlerts = useMemo(() => {
    let filtered = [...alerts];

    if (filters.type !== "Tous") {
      filtered = filtered.filter((alert) => alert.type === filters.type);
    }
    if (filters.statut !== "Tous") {
      filtered = filtered.filter((alert) => alert.statut === filters.statut);
    }

    return filtered.sort((a, b) => b.priorite - a.priorite);
  }, [alerts, filters.type, filters.statut]);

  const alertCounts = useMemo(() => {
    return {
      critique: alerts.filter((alert) => alert.type === "Critique").length,
      avertissement: alerts.filter((alert) => alert.type === "Avertissement").length,
      information: alerts.filter((alert) => alert.type === "Information").length,
      nonTraite: alerts.filter((alert) => alert.statut === "Non traité").length,
    };
  }, [alerts]);

  const handleMarkAsTreated = async (alertId: string) => {
    const current = alerts.find((alert) => alert.id === alertId);
    if (!current) return;

    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              statut: alert.statut === "Traité" ? "Non traité" : "Traité",
            }
          : alert,
      ),
    );

    try {
      const token = localStorage.getItem("access_token");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const res = await fetch(`${API}/directeur/alerts/${alertId}/treat`, {
        method: "POST",
        headers,
      });

      if (!res.ok) {
        throw new Error(`Treat API ${res.status}`);
      }
    } catch (err) {
      console.error("Treat alert error:", err);
      setAlerts((prev) =>
        prev.map((alert) => (alert.id === alertId ? current : alert)),
      );
    }
  };

  const getAlertIcon = (type: AlertSeverity) => {
    switch (type) {
      case "Critique":
        return "🔴";
      case "Avertissement":
        return "🟡";
      case "Information":
        return "🟢";
    }
  };

  const getAlertColor = (type: AlertSeverity) => {
    switch (type) {
      case "Critique":
        return "border-red-200 bg-red-50";
      case "Avertissement":
        return "border-yellow-200 bg-yellow-50";
      case "Information":
        return "border-green-200 bg-green-50";
    }
  };

  const getAlertTextColor = (type: AlertSeverity) => {
    switch (type) {
      case "Critique":
        return "text-red-900";
      case "Avertissement":
        return "text-yellow-900";
      case "Information":
        return "text-green-900";
    }
  };

  return (
    <main className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Alertes et Notifications
        </h1>
        <p className="text-sm text-gray-600">
          Suivi des alertes importantes détectées par le système BI
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xl">🔴</span>
            <span className="text-xs font-semibold text-red-700">Critique</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{alertCounts.critique}</p>
          <p className="mt-1 text-xs text-red-700">Alertes critiques</p>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xl">🟡</span>
            <span className="text-xs font-semibold text-yellow-700">Avertissement</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900">{alertCounts.avertissement}</p>
          <p className="mt-1 text-xs text-yellow-700">Avertissements</p>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xl">🟢</span>
            <span className="text-xs font-semibold text-green-700">Information</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{alertCounts.information}</p>
          <p className="mt-1 text-xs text-green-700">Informations</p>
        </div>

        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xl">⚠️</span>
            <span className="text-xs font-semibold text-orange-700">Action</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">{alertCounts.nonTraite}</p>
          <p className="mt-1 text-xs text-orange-700">À traiter</p>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Filtres</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Type d'alerte
            </label>
            <select
              value={filters.type}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  type: e.target.value as AlertFilterOptions["type"],
                })
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none"
            >
              <option>Tous</option>
              <option>Critique</option>
              <option>Avertissement</option>
              <option>Information</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Statut
            </label>
            <select
              value={filters.statut}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  statut: e.target.value as AlertFilterOptions["statut"],
                })
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none"
            >
              <option>Tous</option>
              <option>Non traité</option>
              <option>Traité</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Période
            </label>
            <select
              value={filters.periode}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  periode: e.target.value as AlertFilterOptions["periode"],
                })
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none"
            >
              <option>24 dernières heures</option>
              <option>7 derniers jours</option>
              <option>30 derniers jours</option>
              <option>Tous</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        {loading ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600">
            Chargement des alertes...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-600">
              Aucune alerte ne correspond à vos filtres
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`overflow-hidden rounded-lg border ${getAlertColor(alert.type)} transition-all ${
                  alert.statut === "Traité"
                    ? "opacity-60"
                    : "shadow-sm hover:shadow-md"
                }`}
              >
                <div
                  className="cursor-pointer p-4"
                  onClick={() =>
                    setExpandedAlert(expandedAlert === alert.id ? null : alert.id)
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-1 items-start gap-3">
                      <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3
                            className={`text-sm font-semibold ${getAlertTextColor(alert.type)}`}
                          >
                            {alert.titre}
                          </h3>
                          <span className="inline-block rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium">
                            {"★".repeat(Math.ceil(alert.priorite / 3))}
                          </span>
                        </div>
                        <p className="mb-2 text-sm text-gray-700">{alert.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>📚 {alert.formation}</span>
                          <span>📅 {alert.date}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-medium ${
                              alert.statut === "Traité"
                                ? "bg-gray-200 text-gray-700"
                                : `bg-white/70 ${getAlertTextColor(alert.type)}`
                            }`}
                          >
                            {alert.statut === "Traité" ? "✓ Traité" : "En attente"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsTreated(alert.id);
                      }}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                        alert.statut === "Traité"
                          ? "bg-gray-300 text-gray-700 hover:bg-gray-400"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {alert.statut === "Traité" ? "Annuler" : "Marquer traité"}
                    </button>
                  </div>

                  {expandedAlert === alert.id && (
                    <div className="mt-4 border-t border-current border-opacity-20 pt-4">
                      <h4 className="mb-2 text-xs font-semibold text-gray-900">Détails</h4>
                      <p className="mb-3 text-sm text-gray-700">{alert.details}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
