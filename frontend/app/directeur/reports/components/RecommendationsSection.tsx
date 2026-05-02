"use client";

import { CheckCircle2, CircleGauge } from "lucide-react";
import type { RecommendationItem, TrendTone } from "./reportTypes";

const toneStyles: Record<TrendTone, string> = {
  positive: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50",
  critical: "border-red-200 bg-red-50",
  neutral: "border-slate-200 bg-slate-50",
};

/**
 * Renders actionable recommendations based on the strategic analysis.
 * Helps the director move from data observation to decision making.
 */
export default function RecommendationsSection({
  recommendations,
}: {
  recommendations: RecommendationItem[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <CheckCircle2 size={18} className="text-slate-700" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Strategic Recommendations
          </h3>
          <p className="text-sm text-slate-500">
            Actions a lancer pour corriger ou amplifier les tendances.
          </p>
        </div>
      </div>
      {/* On transforme ici l'analyse en plan d'action concret :
          quoi faire, par qui, et avec quel impact attendu. */}
      <div className="grid gap-4 xl:grid-cols-3">
        {recommendations.map((recommendation) => (
          <article
            key={recommendation.title}
            className={`rounded-2xl border p-5 shadow-sm ${toneStyles[recommendation.tone]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-900">
                  {recommendation.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {recommendation.description}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  recommendation.priority === "Haute"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {recommendation.priority}
              </span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CircleGauge size={15} className="text-slate-500" />
                <span>Impact attendu: {recommendation.impact}</span>
              </div>
              <p>Responsable suggere: {recommendation.owner}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
