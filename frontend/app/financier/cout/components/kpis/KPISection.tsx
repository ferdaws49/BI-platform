"use client";

import { TrendingDown, DollarSign, Users, BarChart2, Target } from "lucide-react";
import { KPICard, fmtCurrency, glassCard } from "../ui";
import type { KpiCoutsData } from "../../types";

interface Props {
  data: KpiCoutsData | null;
}

export default function KPISection({ data }: Props) {
  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-white/50 border border-gray-100" />
        ))}
      </div>
    );
  }

  const margeGlobale = data.chiffreAffaires - data.coutTotal;
  const tauxMarge = data.chiffreAffaires > 0 ? Math.round((margeGlobale / data.chiffreAffaires) * 100) : 0;

  const partFormateur = data.coutTotal > 0 
    ? Math.round((data.coutFormateurs / data.coutTotal) * 100) 
    : 0;

  // Simulate breakEven status based on typical ratio
  const breakEvenEasy = data.breakEvenStudents < 10;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

      {/* Coût total */}
      <KPICard
        label="Coût Total"
        value={fmtCurrency(data.coutTotal)}
        accentColor="#DC2626"
        valueColor="#DC2626"
        sub={`Dont ${partFormateur}% de coûts formateurs`}
        icon={<TrendingDown size={16} color="#DC2626" />}
      />

      {/* Coût formateurs */}
      <KPICard
        label="Coût Formateurs"
        value={fmtCurrency(data.coutFormateurs)}
        accentColor="#D97706"
        valueColor="#D97706"
        sub="Contrats et honoraires directs"
        icon={<Users size={16} color="#D97706" />}
        badge={
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(217,119,6,0.1)", color: "#D97706" }}
          >
            {partFormateur}% du coût total
          </span>
        }
      />

      {/* Coût moyen / session */}
      <KPICard
        label="Coût Moyen / Session"
        value={fmtCurrency(data.coutMoyenSession)}
        accentColor="#3b82f6"
        sub="Moyenne sur toutes les sessions de la période"
        icon={<BarChart2 size={16} color="#3b82f6" />}
      />

      

      {/* Break-even — carte spéciale */}
      <div
        className="relative rounded-2xl p-5 flex flex-col gap-3 hover:-translate-y-0.5 transition-all duration-300"
        style={glassCard}
      >
        {/* Accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: breakEvenEasy ? "#1a7149" : "#DC2626" }}
        />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: breakEvenEasy ? "rgba(26,113,73,0.1)" : "rgba(220,38,38,0.1)" }}
            >
              <Target size={16} color={breakEvenEasy ? "#1a7149" : "#DC2626"} />
            </div>
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "#2d4a3e", opacity: 0.5 }}
            >
              Break-even Point
            </p>
          </div>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: breakEvenEasy ? "rgba(26,113,73,0.12)" : "rgba(220,38,38,0.1)",
              color: breakEvenEasy ? "#1a7149" : "#DC2626",
            }}
          >
            {breakEvenEasy ? "✓ Facile" : "⚠ Difficile"}
          </span>
        </div>

        {/* Main value */}
        <div className="flex items-baseline gap-2">
          <p
            className="text-3xl font-bold"
            style={{ color: breakEvenEasy ? "#1a7149" : "#DC2626", fontFamily: "'Sora', sans-serif" }}
          >
            {data.breakEvenStudents}
          </p>
          <p className="text-sm" style={{ color: "#2d4a3e", opacity: 0.6 }}>
            étudiants min.
          </p>
        </div>

        {/* Progress toward typical capacity (15) */}
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "#2d4a3e", opacity: 0.5 }}>
            <span>0</span>
            <span>Seuil : {data.breakEvenStudents}</span>
            <span>15 (capacité)</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#e5eadd" }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(data.breakEvenStudents / 15) * 100}%`,
                background: breakEvenEasy ? "#1a7149" : "#DC2626",
              }}
            />
          </div>
        </div>

        <p className="text-xs" style={{ color: "#2d4a3e", opacity: 0.45, borderTop: "1px solid #e5eadd", paddingTop: 8 }}>
          Seuil moyen pour couvrir le coût · Prix moyen : {fmtCurrency(data.prixMoyenFormation)}
        </p>
      </div>

    </div>
  );
}
