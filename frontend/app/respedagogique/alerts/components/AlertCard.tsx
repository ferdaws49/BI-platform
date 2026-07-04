"use client";

import { AlertApprenant } from "./types";
import { RISK_CONFIG, initials, avatarColor } from "./data";
import { RiskBadge } from "./RiskBadge";
import { RiskGauge } from "./RiskGauge";
import { FactorBar } from "./FactorBar";
import { Mail, Phone, Calendar, ChevronDown } from "lucide-react";

interface AlertCardProps {
  apprenant: AlertApprenant;
  expanded: boolean;
  onToggle: () => void;
}

export function AlertCard({ apprenant, expanded, onToggle }: AlertCardProps) {
  const cfg = RISK_CONFIG[apprenant.riskLevel];

  return (
    <div className={`
      bg-card border transition-all duration-300 rounded-[20px] overflow-hidden
      ${expanded ? "border-primary/30 shadow-lg ring-1 ring-primary/5" : "border-border shadow-sm hover:border-primary/20"}
    `}>
      {/* Header row */}
      <div
        onClick={onToggle}
        className="flex items-center gap-4 p-5 cursor-pointer select-none"
      >
        {/* Avatar */}
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-inner"
          style={{ background: avatarColor(apprenant.id) }}
        >
          {initials(apprenant.prenom, apprenant.nom)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-lg text-foreground leading-tight">
              {apprenant.prenom} {apprenant.nom}
            </span>
            <RiskBadge level={apprenant.riskLevel} />
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <span className="font-medium text-primary/80">{apprenant.formation}</span>
            <span className="opacity-30">•</span>
            <span>{apprenant.promotion}</span>
            <span className="opacity-30">•</span>
            <span>{apprenant.lastSeen}</span>
          </div>
        </div>

        {/* Gauge */}
        <div className="hidden sm:block">
          <RiskGauge score={apprenant.riskScore} level={apprenant.riskLevel} />
        </div>

        {/* Chevron */}
        <div className={`p-2 rounded-full transition-all duration-300 ${expanded ? "bg-primary/10 text-primary rotate-180" : "text-muted-foreground"}`}>
          <ChevronDown size={20} />
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 p-6 space-y-6 animate-fadeIn">
          {/* Factors */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground mb-4 uppercase tracking-[0.2em]">
              Analyse des facteurs de risque
            </p>
            <div className="grid gap-3">
              {apprenant.factors.map(f => <FactorBar key={f.label} factor={f} />)}
            </div>
          </div>
{/* Actions */}

    <div className="flex flex-wrap items-center gap-4 pt-2">
      {apprenant.phone && (
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-border text-foreground rounded-xl text-xs font-bold select-none">
          <Phone size={14} className="text-muted-foreground" />
          <span>Contacter sur : {apprenant.phone}</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground italic">
        <span>Formateur responsable :</span>
        <span className="font-bold text-foreground not-italic">{apprenant.formateur}</span>
      </div>
        </div>
        </div>
      )}
    </div>
  );
}