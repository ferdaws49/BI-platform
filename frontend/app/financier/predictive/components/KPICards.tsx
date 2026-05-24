"use client";

import { TrendingUp, TrendingDown, Brain, AlertTriangle, Percent, DollarSign } from "lucide-react";
import type { KPIData } from "../types";

interface KPICardsProps {
  data: KPIData;
  loading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const glassCard = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(229,234,221,0.9)",
};

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={glassCard}>
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl animate-pulse" style={{ background: "#e5eadd" }} />
        <div className="w-16 h-6 rounded-full animate-pulse" style={{ background: "#e5eadd" }} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="w-32 h-7 rounded-lg animate-pulse" style={{ background: "#e5eadd" }} />
        <div className="w-24 h-4 rounded-lg animate-pulse" style={{ background: "#e5eadd" }} />
      </div>
      <div className="w-full h-px" style={{ background: "#e5eadd" }} />
      <div className="w-28 h-4 rounded-lg animate-pulse" style={{ background: "#e5eadd" }} />
    </div>
  );
}

export default function KPICards({ data, loading = false }: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!data) return null;

  const isPositiveGrowth = data.croissance >= 0;

  const kpis = [
    {
      title: "Chiffre d'Affaires",
      value: formatCurrency(data.caRealise),
      sub: `Facturé ce trimestre`,
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
      title: "CA Prévisionnel",
      value: formatCurrency(data.caPredicted),
      sub: "Prédiction modèle IA",
      icon: Brain,
      iconBg: "rgba(99,102,241,0.1)",
      iconColor: "#6366f1",
      badge: {
        text: `+${((data.caPredicted - data.caRealise) / data.caRealise * 100).toFixed(1)}%`,
        positive: true,
        color: "#6366f1",
        bg: "rgba(99,102,241,0.1)",
      },
      accent: "#6366f1",
    },
    {
      title: "Sessions à Risque",
      value: `${data.riskSessionsCount}`,
      sub: "Sessions nécessitant action",
      icon: AlertTriangle,
      iconBg: "rgba(220,38,38,0.1)",
      iconColor: "#DC2626",
      badge: null,
      accent: "#DC2626",
      warning: true,
    },
    {
      title: "Marge Globale",
      value: `${data.profitMargin.toFixed(1)}%`,
      sub: "Marge nette / CA total",
      icon: Percent,
      iconBg: "rgba(45,74,62,0.1)",
      iconColor: "#2d4a3e",
      badge: null,
      accent: "#2d4a3e",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <div
          key={i}
          className="relative rounded-2xl p-5 flex flex-col gap-4 overflow-hidden group hover:-translate-y-0.5 transition-all duration-300"
          style={glassCard}
        >
          {/* Top accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
            style={{ background: kpi.accent }}
          />

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
                  (kpi.badge as any).color
                    ? { background: (kpi.badge as any).bg, color: (kpi.badge as any).color }
                    : kpi.badge.positive
                    ? { background: "rgba(26,113,73,0.12)", color: "#1a7149" }
                    : { background: "rgba(220,38,38,0.1)", color: "#DC2626" }
                }
              >
                {!(kpi.badge as any).color && (
                  kpi.badge.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />
                )}
                {kpi.badge.text}
              </div>
            )}

            {kpi.warning && !kpi.badge && (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "#DC2626" }}
                />
                Urgent
              </div>
            )}
          </div>

          {/* Value */}
          <div>
            <p
              className="text-2xl font-bold font-sora leading-tight"
              style={{ color: kpi.warning ? "#DC2626" : "#2d4a3e" }}
            >
              {kpi.value}
            </p>
            <p className="text-sm mt-1" style={{ color: "#2d4a3e", opacity: 0.5 }}>
              {kpi.title}
            </p>
          </div>

          {/* Sub */}
          <div
            className="flex items-center gap-2 pt-3 border-t"
            style={{ borderColor: "#e5eadd" }}
          >
            <p className="text-xs" style={{ color: "#2d4a3e", opacity: 0.5 }}>
              {kpi.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
