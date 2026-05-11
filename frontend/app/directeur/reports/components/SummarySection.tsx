"use client";

import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CircleDot,
} from "lucide-react";
import type { TrendCard, TrendTone } from "./reportTypes";

type SummarySectionProps = {
  summary: string;
  trendCards: TrendCard[];
  keyMessages: string[];
};

const pillStyles: Record<TrendTone, string> = {
  positive: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100  text-amber-800",
  critical: "bg-red-100    text-red-800",
  neutral: "bg-slate-100  text-slate-700",
};

function PillIcon({ tone }: { tone: TrendTone }) {
  if (tone === "positive") return <TrendingUp size={13} />;
  if (tone === "critical") return <TrendingDown size={13} />;
  return <AlertTriangle size={13} />;
}

export default function SummarySection({
  summary,
  trendCards,
  keyMessages,
}: SummarySectionProps) {
  return (
    <section className="space-y-4">
      {/* Texte narratif */}
      <div className="rounded-2xl bg-slate-50 border border-slate-200 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
          Executive Summary
        </p>
        <p className="text-sm leading-7 text-slate-600 max-w-4xl">{summary}</p>
      </div>

      {/* 3 cartes narratives */}
      <div className="grid gap-4 md:grid-cols-3">
        {trendCards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {card.label}
            </p>
            <div className="h-px bg-slate-100" />
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-snug">
                {card.headline}
              </p>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                {card.sub}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-semibold ${pillStyles[card.tone]}`}
            >
              <PillIcon tone={card.tone} />
              {card.pillText}
            </span>
          </article>
        ))}
      </div>

      {/* Messages à retenir */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={17} className="text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Messages à retenir
          </h3>
        </div>
        <div className="space-y-2">
          {keyMessages.map((msg) => (
            <div
              key={msg}
              className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600 leading-relaxed"
            >
              <CircleDot size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
