"use client";

import { XCircle, Megaphone, TrendingDown, Eye, Zap } from "lucide-react";
import type { Recommendation, RecommendationAction } from "../types";

interface RecommendationsSectionProps {
  recommendations: Recommendation[];
  loading?: boolean;
}

const glassCard = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(229,234,221,0.9)",
};

const ACTION_CONFIG: Record<
  RecommendationAction,
  { icon: React.ElementType; iconBg: string; iconColor: string; accent: string; actionLabel: string }
> = {
  cancel: {
    icon: XCircle,
    iconBg: "rgba(220,38,38,0.1)",
    iconColor: "#DC2626",
    accent: "#DC2626",
    actionLabel: "Annuler",
  },
  promote: {
    icon: Megaphone,
    iconBg: "rgba(59,130,246,0.1)",
    iconColor: "#3b82f6",
    accent: "#3b82f6",
    actionLabel: "Promouvoir",
  },
  "reduce-costs": {
    icon: TrendingDown,
    iconBg: "rgba(217,119,6,0.1)",
    iconColor: "#D97706",
    accent: "#D97706",
    actionLabel: "Optimiser",
  },
  watch: {
    icon: Eye,
    iconBg: "rgba(45,74,62,0.1)",
    iconColor: "#2d4a3e",
    accent: "#2d4a3e",
    actionLabel: "Surveiller",
  },
};

const PRIORITY_CONFIG = {
  high: { bg: "rgba(220,38,38,0.1)", color: "#DC2626", label: "Priorité haute" },
  medium: { bg: "rgba(217,119,6,0.1)", color: "#D97706", label: "Priorité moyenne" },
  low: { bg: "rgba(26,113,73,0.1)", color: "#1a7149", label: "Priorité basse" },
};

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={glassCard}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl animate-pulse" style={{ background: "#e5eadd" }} />
        <div className="w-24 h-6 rounded-full animate-pulse" style={{ background: "#e5eadd" }} />
      </div>
      <div className="w-3/4 h-5 rounded-lg animate-pulse" style={{ background: "#e5eadd" }} />
      <div className="w-full h-4 rounded-lg animate-pulse" style={{ background: "#e5eadd" }} />
      <div className="w-2/3 h-4 rounded-lg animate-pulse" style={{ background: "#e5eadd" }} />
      <div className="w-full h-px" style={{ background: "#e5eadd" }} />
      <div className="w-1/2 h-4 rounded-lg animate-pulse" style={{ background: "#e5eadd" }} />
    </div>
  );
}

export default function RecommendationsSection({ recommendations, loading = false }: RecommendationsSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(26,113,73,0.1)" }}
        >
          <Zap size={18} style={{ color: "#1a7149" }} />
        </div>
        <div>
          <h2 className="text-base font-bold font-sora" style={{ color: "#2d4a3e" }}>
            Recommandations
          </h2>
          <p className="text-xs" style={{ color: "#2d4a3e", opacity: 0.45 }}>
            Actions concrètes pour optimiser votre performance
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : recommendations.map((rec) => {
              const cfg = ACTION_CONFIG[rec.action];
              const pCfg = PRIORITY_CONFIG[rec.priority];
              const Icon = cfg.icon;
              return (
                <div
                  key={rec.id}
                  className="relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden hover:-translate-y-0.5 transition-all duration-300"
                  style={glassCard}
                >
                  {/* Accent bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                    style={{ background: cfg.accent }}
                  />

                  {/* Icon + priority */}
                  <div className="flex items-start justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: cfg.iconBg }}
                    >
                      <Icon size={18} style={{ color: cfg.iconColor }} />
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: pCfg.bg, color: pCfg.color }}
                    >
                      {pCfg.label}
                    </span>
                  </div>

                  {/* Action tag */}
                  <span
                    className="self-start text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wide"
                    style={{ background: cfg.iconBg, color: cfg.iconColor }}
                  >
                    {cfg.actionLabel}
                  </span>

                  {/* Content */}
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-bold font-sora leading-snug" style={{ color: "#2d4a3e" }}>
                      {rec.title}
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: "#2d4a3e", opacity: 0.55 }}>
                      {rec.description}
                    </p>
                  </div>

                  {/* Impact */}
                  <div
                    className="flex items-center gap-2 pt-3 mt-auto border-t"
                    style={{ borderColor: "#e5eadd" }}
                  >
                    <span className="text-xs font-medium" style={{ color: "#2d4a3e", opacity: 0.45 }}>
                      Impact :
                    </span>
                    <span className="text-xs font-semibold" style={{ color: cfg.iconColor }}>
                      {rec.impact}
                    </span>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
