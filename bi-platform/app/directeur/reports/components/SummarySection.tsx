"use client";

import { BrainCircuit, CircleAlert, TrendingUp } from "lucide-react";
import type { SummaryMetric, TrendTone } from "./reportTypes";

type SummarySectionProps = {
  summary: string;
  metrics: SummaryMetric[];
  keyMessages: string[];
};

// Styles visuels selon le niveau du signal métier.
const toneStyles: Record<TrendTone, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-red-200 bg-red-50 text-red-900",
  neutral: "border-slate-200 bg-slate-50 text-slate-900",
};

const deltaStyles: Record<TrendTone, string> = {
  positive: "text-emerald-700",
  warning: "text-amber-700",
  critical: "text-red-700",
  neutral: "text-slate-600",
};

export default function SummarySection({
  summary,
  metrics,
  keyMessages,
}: SummarySectionProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
            <BrainCircuit size={20} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Executive Summary
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Lecture strategique de la performance
            </h2>
            {/* Texte narratif principal :
                il résume en langage métier la situation du moment. */}
            <p className="max-w-4xl text-sm leading-6 text-slate-600">
              {summary}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr,1fr]">
        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className={`rounded-2xl border p-5 shadow-sm ${toneStyles[metric.tone]}`}
            >
              {/* Chaque carte donne un indicateur de synthèse
                  avec sa variation par rapport à la période précédente. */}
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
              <p className={`mt-2 text-sm font-medium ${deltaStyles[metric.tone]}`}>
                {metric.delta}
              </p>
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              Messages a retenir
            </h3>
          </div>
          {/* Cette colonne sert à mettre en avant
              les points que le directeur doit retenir immédiatement. */}
          <div className="space-y-3">
            {keyMessages.map((message) => (
              <div
                key={message}
                className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700"
              >
                <CircleAlert size={16} className="mt-0.5 text-slate-500" />
                <span>{message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
