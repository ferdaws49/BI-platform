"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, Filter, BookOpen } from "lucide-react";
import type { PeriodFilter } from "../types";


function getPeriodDates(period: string) {
  const now = new Date();

  const format = (d: Date) => d.toISOString().split("T")[0];

  const endDate = format(now);
  const start = new Date(now);

  if (period === "Mois" || period === "month") {
    start.setDate(now.getDate() - 30);
  }

  if (period === "Trimestre" || period === "quarter") {
    start.setDate(now.getDate() - 90);
  }

  if (period === "Année" || period === "year") {
  start.setFullYear(now.getFullYear());
  start.setMonth(0);
  start.setDate(1);
}

  return {
    startDate: format(start),
    endDate,
  };
}


interface FiltersBarProps {
  onFilterChange: (filters: any) => void;
  formations: { id: number; titre: string }[];
}

const mapPeriod = (p: string) => {
  if (p === "Mois") return "month";
  if (p === "Trimestre") return "quarter";
  if (p === "Année") return "year";
  return "year";
};



export default function FiltersBar({ onFilterChange, formations }: FiltersBarProps) {
  const [period, setPeriod] = useState("Année");
  const [status, setStatus] = useState("Tout");
  const [formationId, setFormationId] = useState("");

  
  const handleApplyFilters = (p: string, status: string, formationId: string) => {
    const mapPeriod = (p: string) => {
  if (p === "Mois") return "month";
  if (p === "Trimestre") return "quarter";
  if (p === "Année") return "year";
  return "year";
};

const mapStatus = (s: string) => {
  const map: Record<string, string> = {
    
    "Payé": "paid",
    "En attente": "partial",
    "Impayé": "unpaid",
    "Tout": "",
  };

  return map[s] ?? "";
};

    const dates = getPeriodDates(mapPeriod(p));

    onFilterChange({
      startDate: dates.startDate,
      endDate: dates.endDate,
      status: mapStatus(status) || undefined,
      formationId: formationId === "" ? undefined : Number(formationId), // <-- TRÈS IMPORTANT
    });
  };

  const getExerciceYear = () => {
  const now = new Date();

  if (period === "Année") return now.getFullYear();
  if (period === "Trimestre" || period === "Mois")
    return new Date(getPeriodDates(mapPeriod(period)).startDate).getFullYear();

  return now.getFullYear();
};
const exerciceLabel = `Exercice ${getExerciceYear()}`;

  return (
    <div
      className="flex flex-wrap items-center gap-3 p-2 rounded-xl bg-card border border-border shadow-sm"
    >
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <CalendarDays size={16} className="text-primary" />
        <span className="text-sm font-medium text-muted-foreground">
          Période :
        </span>
      </div>
      <div className="flex gap-1">
        {["Mois", "Trimestre", "Année"].map((p) => (
          <button
            key={p}
            onClick={() => {
              setPeriod(p);
              handleApplyFilters(p, status, formationId);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              period === p
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-accent/20 hover:text-accent-foreground"
            }`}

          >
            {p}
          </button>
        ))}
      </div>

      <div className="w-px h-6 mx-1 bg-border" />

      {/* Formation selector */}
      <div className="flex items-center gap-2">
        <BookOpen size={16} className="text-primary" />
        <div
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer bg-secondary border border-border"
        >
          <select
          value={formationId}
          
             onChange={(e) => {const value = e.target.value;
              setFormationId(value);
              handleApplyFilters(period, status, value);}}
            className="appearance-none bg-transparent text-sm font-medium outline-none pr-5 cursor-pointer text-foreground"  
          >
            <option value="">Toutes les formations</option>
            {formations && formations.map((f) => (
              <option key={f.id} value={f.id}>{f.titre}</option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2 pointer-events-none text-muted-foreground/70"
          />
        </div>
      </div>

      <div className="w-px h-6 mx-1 bg-border" />

      {/* Status filter */}
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-primary" />
        <span className="text-sm font-medium text-muted-foreground">
          Statut :
        </span>
      </div>
      <div className="flex gap-1">
        {["Tout", "Payé", "En attente"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              handleApplyFilters(period, s, formationId);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              status === s
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-accent/20 hover:text-accent-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Active period badge */}
      <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs font-medium text-primary">
          {exerciceLabel}
        </span>
      </div>
    </div>
  );
}
