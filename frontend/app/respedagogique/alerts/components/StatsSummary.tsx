"use client";

import { RISK_CONFIG } from "./data";

interface StatsSummaryProps {
  stats: {
    critique: number;
    eleve: number;
    modere: number;
    faible: number;
  };
}

function StatsPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex-1 min-w-[120px] flex flex-col items-center p-4 bg-card border border-border rounded-2xl shadow-soft transition-all hover:scale-105">
      <span className="text-3xl font-black mb-1" style={{ color }}>{count}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

export function StatsSummary({ stats }: StatsSummaryProps) {
  return (
    <div className="flex gap-4 flex-wrap">
      <StatsPill label="Critique" count={stats.critique} color={RISK_CONFIG.critique.dot} />
      <StatsPill label="Élevé"    count={stats.eleve}    color={RISK_CONFIG.eleve.dot}    />
      <StatsPill label="Modéré"   count={stats.modere}   color={RISK_CONFIG.modere.dot}   />
      <StatsPill label="Faible"   count={stats.faible}   color={RISK_CONFIG.faible.dot}   />
    </div>
  );
}