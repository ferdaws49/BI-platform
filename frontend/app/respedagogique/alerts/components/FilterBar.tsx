"use client";

import { RISK_LEVELS, FORMATIONS, FORMATIONS_SHORT, RISK_CONFIG } from "./data";
import { RiskLevel } from "./types";
import { Search, RotateCcw } from "lucide-react";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterLevel: string;
  onFilterLevelChange: (value: string) => void;
  filterFormation: string;
  onFilterFormationChange: (value: string) => void;
  sortBy: "score" | "nom";
  onSortChange: (value: "score" | "nom") => void;
  activeFilters: number;
  onReset: () => void;
}

export function FilterBar({
  search,
  onSearchChange,
  filterLevel,
  onFilterLevelChange,
  filterFormation,
  onFilterFormationChange,
  sortBy,
  onSortChange,
  activeFilters,
  onReset,
}: FilterBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pb-4 pt-1">
      <div className="flex gap-3 flex-wrap items-center bg-card border border-border rounded-2xl p-3 shadow-soft">
        
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
          <input
            type="text"
            placeholder="Chercher un apprenant..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-transparent focus:border-primary/30 focus:bg-white rounded-xl text-sm outline-none transition-all"
          />
        </div>

        {/* Filters Group */}
        <div className="flex gap-2 flex-wrap">
          {/* Risk level filter */}
          <select
            value={filterLevel}
            onChange={e => onFilterLevelChange(e.target.value)}
            className="bg-muted/50 border border-transparent hover:border-border px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer transition-all focus:bg-white"
          >
            {RISK_LEVELS.map(l => (
              <option key={l} value={l}>
                {l === "Tous" ? "Niveau: Tous" : `Risque: ${RISK_CONFIG[l as RiskLevel].label}`}
              </option>
            ))}
          </select>

          {/* Formation filter */}
          <select
            value={filterFormation}
            onChange={e => onFilterFormationChange(e.target.value)}
            className="bg-muted/50 border border-transparent hover:border-border px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer transition-all focus:bg-white"
          >
            {FORMATIONS.map(f => (
              <option key={f} value={f}>{f === "Toutes" ? "Formation: Toutes" : (FORMATIONS_SHORT[f] ?? f)}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => onSortChange(e.target.value as "score" | "nom")}
            className="bg-muted/50 border border-transparent hover:border-border px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer transition-all focus:bg-white"
          >
            <option value="score">Trier par risque</option>
            <option value="nom">Trier par nom</option>
          </select>

          {/* Reset */}
          {activeFilters > 0 && (
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-xs font-bold hover:bg-destructive/20 transition-all"
            >
              <RotateCcw size={14} />
              Reset ({activeFilters})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}