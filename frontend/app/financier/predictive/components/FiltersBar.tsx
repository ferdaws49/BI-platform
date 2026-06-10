"use client";

import { useState } from "react";
import { CalendarDays, BookOpen, Users, Monitor, ChevronDown } from "lucide-react";
import type { FilterState, PeriodOption, Formation, Formateur } from "../types";

interface FiltersBarProps {
  formations: Formation[];
  formateurs: Formateur[];
  onFilterChange: (filters: FilterState) => void;
}

// Composant interne pour les menus déroulants
function SelectDropdown({
  icon: Icon,
  value,
  onChange,
  options,
}: {
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} style={{ color: "#1a7149" }} />
      <div className="relative flex items-center px-3 py-1.5 rounded-lg bg-[#efefea]">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-transparent text-sm font-medium outline-none pr-6 cursor-pointer text-[#2d4a3e]"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2 pointer-events-none opacity-40" />
      </div>
    </div>
  );
}

const PERIODS: PeriodOption[] = ["Mois", "Trimestre", "Année", "Personnalisé"];

function getPeriodDates(period: PeriodOption, customStart?: string, customEnd?: string) {
  const now = new Date();
  const format = (d: Date) => d.toISOString().split("T")[0];
  const start = new Date(now);
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  if (period === "Mois") {
    start.setDate(now.getDate() - 30);
    return {
      dateFrom: format(start),
      dateTo: format(now),
    };
  }

  if (period === "Trimestre") {
    start.setDate(now.getDate() - 90);
    return {
      dateFrom: format(start),
      dateTo: format(now),
    };
  }

  if (period === "Année") {
    return {
      dateFrom: format(startOfYear),
      dateTo: format(now),
    };
  }

  return {
    dateFrom: customStart || format(startOfYear),
    dateTo: customEnd || format(now),
  };
}

export default function FiltersBar({ formations, formateurs, onFilterChange }: FiltersBarProps) {
  // 1. États locaux (Initialisés par défaut avec Mois : 30 derniers jours)
  const defaultDates = getPeriodDates("Mois");
  const [period, setPeriod] = useState<PeriodOption>("Mois");
  const [dateFrom, setDateFrom] = useState(defaultDates.dateFrom);
  const [dateTo, setDateTo] = useState(defaultDates.dateTo);
  const [formationId, setFormationId] = useState("all");
  const [formateurId, setFormateurId] = useState("all");
  const [sessionType, setSessionType] = useState<FilterState["sessionType"]>("Tout");

  // 2. Fonction pour envoyer les filtres au parent (PredictiveDashboard)
  const applyChange = (overrides: Partial<FilterState>) => {
    const newState: FilterState = {
      period: overrides.period ?? period,
      dateFrom: overrides.hasOwnProperty("dateFrom") ? overrides.dateFrom : dateFrom,
      dateTo: overrides.hasOwnProperty("dateTo") ? overrides.dateTo : dateTo,
      formationId: overrides.formationId ?? formationId,
      formateurId: overrides.formateurId ?? formateurId,
      sessionType: overrides.sessionType ?? sessionType,
    };
    onFilterChange(newState);
  };

  // Gestion du changement de période
  const handlePeriodChange = (p: PeriodOption) => {
    setPeriod(p);
    if (p !== "Personnalisé") {
      const dates = getPeriodDates(p);
      setDateFrom(dates.dateFrom);
      setDateTo(dates.dateTo);
      applyChange({ period: p, dateFrom: dates.dateFrom, dateTo: dates.dateTo });
    } else {
      applyChange({ period: p });
    }
  };

  // 3. Plus de limitation à 10 éléments, on affiche tout !
  const safeFormations = Array.isArray(formations) ? formations : [];
  const safeFormateurs = Array.isArray(formateurs) ? formateurs : [];

  const limitedFormations = [
    { id: "all", title: "Toutes les formations" },
    ...safeFormations.filter(f => f.id !== "all")
  ];

  const limitedFormateurs = [
    { id: "all", name: "Tous les formateurs" },
    ...safeFormateurs.filter(f => f.id !== "all")
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 p-2 rounded-xl bg-white border border-border shadow-sm">
        
        {/* Périodes */}
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p ? "bg-[#1a7149] text-white" : "bg-[#efefea] text-[#2d4a3e]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Date pickers pour Personnalisé */}
        {period === "Personnalisé" && (
          <div className="flex items-center gap-2 animate-fadeIn">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                applyChange({ dateFrom: e.target.value });
              }}
              className="px-2 py-1 rounded border border-border bg-[#efefea] text-[#2d4a3e] text-sm focus:outline-none"
            />
            <span className="text-xs text-[#2d4a3e] font-medium">au</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                applyChange({ dateTo: e.target.value });
              }}
              className="px-2 py-1 rounded border border-border bg-[#efefea] text-[#2d4a3e] text-sm focus:outline-none"
            />
          </div>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        {/* Liste Formations */}
        <SelectDropdown
          icon={BookOpen}
          value={formationId}
          onChange={(v) => { setFormationId(v); applyChange({ formationId: v }); }}
          options={limitedFormations.map((f) => ({ value: f.id, label: f.title }))}
        />

        {/* Liste Formateurs */}
        <SelectDropdown
          icon={Users}
          value={formateurId}
          onChange={(v) => { setFormateurId(v); applyChange({ formateurId: v }); }}
          options={limitedFormateurs.map((f) => ({ value: f.id, label: f.name }))}
        />

        <div className="w-px h-6 bg-border mx-1" />

        {/* Type de Session */}
        <div className="flex gap-1">
          {(["Tout", "En ligne", "Présentiel"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setSessionType(s); applyChange({ sessionType: s }); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                sessionType === s ? "bg-[#2d4a3e] text-white" : "bg-[#efefea] text-[#2d4a3e]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}