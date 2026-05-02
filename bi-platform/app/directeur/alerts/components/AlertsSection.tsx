"use client";

import { useMemo, useState } from "react";
import type {
  AlertFilterOptions,
  AlertSeverity,
  AlertStatus,
} from "@/app/directeur/alerts/components/alertTypes";

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

// Données statiques d'alertes pour la démonstration.
const alertsData: Alert[] = [
  {
    id: "1",
    type: "Critique",
    titre: "Taux d'abandon élevé",
    description: "Le taux d'abandon pour Data Science a dépassé 35%",
    formation: "Data Science",
    date: "2026-04-05",
    priorite: 9,
    statut: "Non traité",
    details:
      "52 apprenants inscrits, 18 ont abandonné. Taux : 34.6%. Recommandations : revoir le contenu du cours et contacter les apprenants.",
  },
  {
    id: "2",
    type: "Critique",
    titre: "Chute du taux de réussite",
    description: "Le taux de réussite Java baisse à 78% alors qu'il était à 92%",
    formation: "Java",
    date: "2026-04-04",
    priorite: 8,
    statut: "Non traité",
    details:
      "Les étudiants trouvent les exercices trop difficiles. Suggestion : adapter la progression pédagogique.",
  },
  {
    id: "3",
    type: "Avertissement",
    titre: "Satisfaction faible",
    description: "L'évaluation moyenne Web Dev chute à 3.2/5",
    formation: "Web Dev",
    date: "2026-04-03",
    priorite: 6,
    statut: "Non traité",
    details: "Les apprenants mentionnent un manque de pratique.",
  },
  {
    id: "4",
    type: "Avertissement",
    titre: "Baisse des inscriptions",
    description: "Les inscriptions UI/UX baissent de 40% sur 2 semaines",
    formation: "UI/UX",
    date: "2026-04-02",
    priorite: 7,
    statut: "Traité",
    details: "Besoin d'une stratégie marketing renforcée.",
  },
  {
    id: "5",
    type: "Information",
    titre: "Nouvelle formation créée",
    description: "La formation DevOps a été ajoutée au catalogue",
    formation: "DevOps",
    date: "2026-04-05",
    priorite: 3,
    statut: "Non traité",
    details: "Formation disponible à partir du 15 avril.",
  },
  {
    id: "6",
    type: "Information",
    titre: "Pic d'inscriptions",
    description: "Marketing reçoit 23 nouvelles inscriptions",
    formation: "Marketing",
    date: "2026-04-01",
    priorite: 2,
    statut: "Traité",
    details: "Augmentation due à la campagne récente.",
  },
  {
    id: "7",
    type: "Critique",
    titre: "Revenus en baisse",
    description: "Les revenus Data Engineering baissent de 25%",
    formation: "Data Engineering",
    date: "2026-04-04",
    priorite: 9,
    statut: "Non traité",
    details: "Corrélation avec la baisse des inscriptions.",
  },
  {
    id: "8",
    type: "Avertissement",
    titre: "Absence formateur",
    description: "Le formateur de Web Dev sera absent demain",
    formation: "Web Dev",
    date: "2026-04-05",
    priorite: 5,
    statut: "Non traité",
    details: "Besoin d'un remplaçant ou d'un report de cours.",
  },
];

function getReferenceDate() {
  const timestamps = alertsData.map((alert) => new Date(alert.date).getTime());
  return new Date(Math.max(...timestamps));
}

function matchesPeriod(date: string, period: AlertFilterOptions["periode"]) {
  if (period === "Tous") return true;

  // On prend la date la plus récente du dataset comme référence
  // pour garder une démo cohérente même avec des données statiques.
  const alertDate = new Date(date);
  const referenceDate = getReferenceDate();
  const diffInDays =
    (referenceDate.getTime() - alertDate.getTime()) / (1000 * 60 * 60 * 24);

  if (period === "24 dernières heures") return diffInDays <= 1;
  if (period === "7 derniers jours") return diffInDays <= 7;
  return diffInDays <= 30;
}

export default function AlertsSection({
  filters,
  onFiltersChange,
}: {
  filters: AlertFilterOptions;
  onFiltersChange: (filters: AlertFilterOptions) => void;
}) {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [treatedAlerts, setTreatedAlerts] = useState<Set<string>>(
    new Set(alertsData.filter((a) => a.statut === "Traité").map((a) => a.id)),
  );

  // La liste filtrée dépend directement de la prop filters.
  const filteredAlerts = useMemo(() => {
    let filtered = alertsData.map((alert) => ({
      ...alert,
      statut: treatedAlerts.has(alert.id) ? "Traité" : "Non traité",
    }));

    if (filters.type !== "Tous")
      filtered = filtered.filter((alert) => alert.type === filters.type);
    if (filters.statut !== "Tous")
      filtered = filtered.filter((alert) => alert.statut === filters.statut);

    filtered = filtered.filter((alert) =>
      matchesPeriod(alert.date, filters.periode),
    );

    return filtered.sort((a, b) => b.priorite - a.priorite);
  }, [filters, treatedAlerts]);

  const alertCounts = useMemo(() => {
    return {
      critique: alertsData.filter((alert) => alert.type === "Critique").length,
      avertissement: alertsData.filter(
        (alert) => alert.type === "Avertissement",
      ).length,
      information: alertsData.filter((alert) => alert.type === "Information")
        .length,
      nonTraite: alertsData.filter((alert) => !treatedAlerts.has(alert.id))
        .length,
    };
  }, [treatedAlerts]);

  const handleMarkAsTreated = (alertId: string) => {
    setTreatedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(alertId)) next.delete(alertId);
      else next.add(alertId);
      return next;
    });
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

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xl">🔴</span>
            <span className="text-xs font-semibold text-red-700">Critique</span>
          </div>
          <p className="text-2xl font-bold text-red-900">
            {alertCounts.critique}
          </p>
          <p className="mt-1 text-xs text-red-700">Alertes critiques</p>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xl">🟡</span>
            <span className="text-xs font-semibold text-yellow-700">
              Avertissement
            </span>
          </div>
          <p className="text-2xl font-bold text-yellow-900">
            {alertCounts.avertissement}
          </p>
          <p className="mt-1 text-xs text-yellow-700">Avertissements</p>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xl">🟢</span>
            <span className="text-xs font-semibold text-green-700">
              Information
            </span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {alertCounts.information}
          </p>
          <p className="mt-1 text-xs text-green-700">Informations</p>
        </div>

        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xl">⚠️</span>
            <span className="text-xs font-semibold text-orange-700">
              Action
            </span>
          </div>
          <p className="text-2xl font-bold text-orange-900">
            {alertCounts.nonTraite}
          </p>
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
        {filteredAlerts.length === 0 ? (
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
                className={`overflow-hidden rounded-lg border ${getAlertColor(
                  alert.type,
                )} transition-all ${
                  treatedAlerts.has(alert.id)
                    ? "opacity-60"
                    : "shadow-sm hover:shadow-md"
                }`}
              >
                <div
                  className="cursor-pointer p-4"
                  onClick={() =>
                    setExpandedAlert(
                      expandedAlert === alert.id ? null : alert.id,
                    )
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
                        <p className="mb-2 text-sm text-gray-700">
                          {alert.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>📚 {alert.formation}</span>
                          <span>📅 {alert.date}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-medium ${
                              treatedAlerts.has(alert.id)
                                ? "bg-gray-200 text-gray-700"
                                : `bg-white/70 ${getAlertTextColor(alert.type)}`
                            }`}
                          >
                            {treatedAlerts.has(alert.id)
                              ? "✓ Traité"
                              : "En attente"}
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
                        treatedAlerts.has(alert.id)
                          ? "bg-gray-300 text-gray-700 hover:bg-gray-400"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {treatedAlerts.has(alert.id)
                        ? "Annuler"
                        : "Marquer traité"}
                    </button>
                  </div>

                  {expandedAlert === alert.id && (
                    <div className="mt-4 border-t border-current border-opacity-20 pt-4">
                      <h4 className="mb-2 text-xs font-semibold text-gray-900">
                        Détails
                      </h4>
                      <p className="mb-3 text-sm text-gray-700">
                        {alert.details}
                      </p>
                      <div className="flex gap-2">
                        <button className="flex-1 rounded border border-current border-opacity-30 bg-white/70 px-3 py-2 text-xs font-medium text-gray-900 transition-colors hover:bg-white">
                          Voir détails complets
                        </button>
                        <button className="flex-1 rounded border border-current border-opacity-30 bg-white/70 px-3 py-2 text-xs font-medium text-gray-900 transition-colors hover:bg-white">
                          Voir formation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <h4 className="mb-2 text-sm font-semibold text-gray-900">
          Légende des priorités
        </h4>
        <div className="grid gap-3 text-xs text-gray-600 sm:grid-cols-3">
          <div>
            <span className="font-medium">★ </span> Priorité faible
          </div>
          <div>
            <span className="font-medium">★★★ </span> Priorité moyenne
          </div>
          <div>
            <span className="font-medium">★★★★★ </span> Priorité critique
          </div>
        </div>
      </section>
    </main>
  );
}
