"use client";

import { XCircle, Megaphone, TrendingDown, Eye, Zap, ChevronRight, ChevronLeft } from "lucide-react";
import type { Recommendation, RecommendationAction } from "../types";
import { useState } from "react";

interface RecommendationsSectionProps {
  recommendations: Recommendation[];
  loading?: boolean;
}

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
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 shadow-sm animate-pulse">
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

export default function RecommendationsSection({ recommendations, loading = false }: { recommendations: any[], loading: boolean }) {
  const [page, setPage] = useState(1);
  const perPage = 4;
  const totalPages = Math.ceil(recommendations.length / perPage);
  const current = recommendations.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#2d4a3e]">Recommandations Stratégiques</h2>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} className="p-1 border rounded disabled:opacity-20" disabled={page === 1}><ChevronLeft size={16}/></button>
            <span className="text-xs font-bold">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="p-1 border rounded disabled:opacity-20" disabled={page === totalPages}><ChevronRight size={16}/></button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {current.map((rec) => (
           <div key={rec.id} className="bg-white p-4 rounded-xl border border-[#e5eadd] shadow-sm">
             {/* Contenu de la recommandation ... */}
             <h4 className="font-bold text-sm">{rec.title}</h4>
             <p className="text-xs text-gray-500 mt-2">{rec.description}</p>
             <div className="mt-4 text-xs font-bold text-[#1a7149] bg-[#1a7149]/10 p-2 rounded">{rec.impact}</div>
           </div>
        ))}
      </div>
    </div>
  );
}
