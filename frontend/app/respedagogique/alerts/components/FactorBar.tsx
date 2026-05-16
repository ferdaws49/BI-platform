"use client";

import { RiskFactor } from "./types";

export function FactorBar({ factor }: { factor: RiskFactor }) {
  const riskContrib = 100 - factor.value;
  const color = riskContrib > 65 ? "hsl(var(--destructive))" : riskContrib > 40 ? "hsl(var(--warning))" : "hsl(var(--success))";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[11px]">
        <span className="font-bold text-muted-foreground">
          {factor.label} <span className="opacity-50 ml-1">({factor.weight}%)</span>
        </span>
        <span className="font-black" style={{ color }}>
          {factor.detail}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-1000 ease-out rounded-full"
          style={{ width: `${riskContrib}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}