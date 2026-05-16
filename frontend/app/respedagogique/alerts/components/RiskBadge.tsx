"use client";

import { RiskLevel } from "./types";
import { RISK_CONFIG } from "./data";

export function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg = RISK_CONFIG[level];
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
      border shadow-sm
    `} style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}