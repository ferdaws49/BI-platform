"use client";

import { RiskLevel } from "./types";
import { RISK_CONFIG } from "./data";

export function RiskGauge({ score, level }: { score: number; level: RiskLevel }) {
  const cfg = RISK_CONFIG[level];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ position: "relative", width: 52, height: 52 }}>
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="21" fill="none" stroke="#e5e7eb" strokeWidth="5" />
          <circle
            cx="26" cy="26" r="21" fill="none"
            stroke={cfg.dot} strokeWidth="5"
            strokeDasharray={`${(score / 100) * 131.9} 131.9`}
            strokeLinecap="round"
            transform="rotate(-90 26 26)"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <span style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: cfg.color, fontFamily: "'DM Sans', sans-serif",
        }}>{score}%</span>
      </div>
    </div>
  );
}