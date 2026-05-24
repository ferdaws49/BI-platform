"use client";

import { TrendingUp, TrendingDown, Minus, Lightbulb, AlertTriangle, Eye } from "lucide-react";
import type { Insight, InsightType } from "../types";

interface InsightsSectionProps {
  insights: Insight[];
  loading?: boolean;
}

const glassCard = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(229,234,221,0.9)",
};

const TYPE_CONFIG: Record<InsightType, { icon: React.ElementType; iconBg: string; iconColor: string; accent: string }> = {
  trend: { icon: TrendingUp, iconBg: "rgba(26,113,73,0.1)", iconColor: "#1a7149", accent: "#1a7149" },
  risk: { icon: AlertTriangle, iconBg: "rgba(220,38,38,0.1)", iconColor: "#DC2626", accent: "#DC2626" },
  observation: { icon: Eye, iconBg: "rgba(45,74,62,0.1)", iconColor: "#2d4a3e", accent: "#2d4a3e" },
};

function DirectionIcon({ direction }: { direction?: Insight["direction"] }) {
  if (direction === "up") return <TrendingUp size={14} style={{ color: "#1a7149" }} />;
  if (direction === "down") return <TrendingDown size={14} style={{ color: "#DC2626" }} />;
  return <Minus size={14} style={{ color: "#2d4a3e", opacity: 0.4 }} />;
}

function SkeletonInsight() {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={glassCard}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl animate-pulse" style={{ background: "#e5eadd" }} />
        <div className="w-32 h-5 rounded-lg animate-pulse" style={{ background: "#e5eadd" }} />
      </div>
      <div className="w-full h-4 rounded-lg animate-pulse" style={{ background: "#e5eadd" }} />
      <div className="w-3/4 h-4 rounded-lg animate-pulse" style={{ background: "#e5eadd" }} />
    </div>
  );
}

export default function InsightsSection({ insights, loading = false }: InsightsSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(26,113,73,0.1)" }}
        >
          <Lightbulb size={18} style={{ color: "#1a7149" }} />
        </div>
        <div>
          <h2 className="text-base font-bold font-sora" style={{ color: "#2d4a3e" }}>
            Insights IA
          </h2>
          <p className="text-xs" style={{ color: "#2d4a3e", opacity: 0.45 }}>
            Observations clés générées automatiquement
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonInsight key={i} />)
          : insights.map((insight) => {
              const cfg = TYPE_CONFIG[insight.type];
              const Icon = cfg.icon;
              return (
                <div
                  key={insight.id}
                  className="relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden hover:-translate-y-0.5 transition-all duration-300"
                  style={glassCard}
                >
                  {/* Accent bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                    style={{ background: cfg.accent }}
                  />

                  {/* Icon + value row */}
                  <div className="flex items-start justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: cfg.iconBg }}
                    >
                      <Icon size={18} style={{ color: cfg.iconColor }} />
                    </div>
                    {insight.value && (
                      <div
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: cfg.iconBg, color: cfg.iconColor }}
                      >
                        <DirectionIcon direction={insight.direction} />
                        {insight.value}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-bold font-sora" style={{ color: "#2d4a3e" }}>
                      {insight.title}
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: "#2d4a3e", opacity: 0.55 }}>
                      {insight.description}
                    </p>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
