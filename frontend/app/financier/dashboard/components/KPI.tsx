"use client";

import { TrendingUp, TrendingDown, AlertCircle, Percent, DollarSign } from "lucide-react";
import type { KPIData } from "../types";

interface KPICardsProps {
  data: KPIData;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function KPICards({ data }: KPICardsProps) {

   if (!data) return null;

  const isPositiveGrowth = data.croissance >= 0;

  const kpis = [
    {
      title: "Chiffre d'Affaires",
      value: formatCurrency(data.caRealise),
      sub: `Facturé: ${formatCurrency(data.caFacture)}`,
      icon: DollarSign,
      iconBg: "rgba(26,113,73,0.12)",
      iconColor: "#1a7149",
      badge: {
        text: `${isPositiveGrowth ? "+" : ""}${data.croissance.toFixed(1)}%`,
        positive: isPositiveGrowth,
      },
      accent: "#1a7149",
    },
    {
      title: "Encours Client",
      value: formatCurrency(data.encoursClient),
      sub: "Reste à recouvrer",
      icon: AlertCircle,
      iconBg: "rgba(220,38,38,0.1)",
      iconColor: "#DC2626",
      badge: null,
      accent: "#DC2626",
      warning: data.encoursClient > 5000, // Alerte si l'encours est élevé
    },
    {
      title: "Taux de Marge",
      value: `${data.tauxMarge.toFixed(1)}%`,
      sub: "Rentabilité financière",
      icon: Percent,
      iconBg: "rgba(45,74,62,0.1)",
      iconColor: "#2d4a3e",
      badge: null,
      accent: "#2d4a3e",
    },
    {
      title: "Marge Brute",
      value: formatCurrency(data.margeBrute),
      sub: "Bénéfice réalisé",
      icon: TrendingUp,
      iconBg: "rgba(26,113,73,0.12)",
      iconColor: "#1a7149",
      badge: null,
      accent: "#1a7149",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 group"
        >
          {/* Icon + badge row */}
          <div className="flex items-start justify-between">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: kpi.iconBg }}
            >
              <kpi.icon size={22} style={{ color: kpi.iconColor }} />
            </div>

            {kpi.badge && (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style={
                  kpi.badge.positive
                    ? { background: "rgba(26,113,73,0.12)", color: "#1a7149" }
                    : { background: "rgba(220,38,38,0.1)", color: "#DC2626" }
                }
              >
                {kpi.badge.positive ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {kpi.badge.text}
              </div>
            )}

            {kpi.warning && (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#DC2626" }} />
                Urgent
              </div>
            )}
          </div>

          {/* Value */}
          <div>
            <p
              className="text-2xl font-bold leading-tight"
              style={{ color: kpi.warning ? "#DC2626" : "#2d4a3e" }}
            >
              {kpi.value}
            </p>
            <p className="text-sm mt-1 text-muted-foreground">
              {kpi.title}
            </p>
          </div>

          {/* Sub */}
          <div
            className="flex items-center gap-2 pt-3 border-t border-border"
          >
            <p className="text-xs text-muted-foreground">
              {kpi.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
