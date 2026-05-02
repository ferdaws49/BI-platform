"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { RiskItem, TrendTone } from "./reportTypes";

const riskStyles: Record<TrendTone, string> = {
  positive: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50",
  critical: "border-red-200 bg-red-50",
  neutral: "border-slate-200 bg-slate-50",
};

/**
 * Displays potential risks and future scenarios.
 * Encourages proactive management by highlighting what might happen if trends persist.
 */
export default function RiskSection({ risks }: { risks: RiskItem[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <ShieldAlert size={18} className="text-slate-700" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Scenario / Risk Analysis
          </h3>
          <p className="text-sm text-slate-500">
            Projection des risques si les tendances restent inchangees.
          </p>
        </div>
      </div>
      {/* Cette section aide le directeur à se projeter :
          que peut-il arriver si aucune décision n'est prise ? */}
      <div className="grid gap-4 lg:grid-cols-3">
        {risks.map((risk) => (
          <article
            key={risk.title}
            className={`rounded-2xl border p-5 ${riskStyles[risk.tone]}`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 text-slate-700" />
              <div>
                <h4 className="text-base font-semibold text-slate-900">
                  {risk.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {risk.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-slate-700">
                    Horizon: {risk.horizon}
                  </span>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-slate-700">
                    Probabilite: {risk.probability}
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
