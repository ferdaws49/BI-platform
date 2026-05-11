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
    start.setDate(now.getDate() - 365);
  }

  return {
    startDate: format(start),
    endDate,
  };
}



const glassStyle = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(229,234,221,0.8)",
};

interface FiltersBarProps {
  onFilterChange: (filters: any) => void;
  formations: { id: number; title: string }[];
}

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
      formationId: formationId ? Number(formationId) : undefined,
    });
  };

  return (
    <div
      className="flex flex-wrap items-center gap-3 p-4 rounded-2xl"
      style={glassStyle}
    >
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <CalendarDays size={16} style={{ color: "#1a7149" }} />
        <span className="text-sm font-medium" style={{ color: "#2d4a3e", opacity: 0.7 }}>
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
              period === p ? "bg-[#1a7149] text-white" : "bg-[#efefea] text-[#2d4a3e]"
            }`}

          >
            {p}
          </button>
        ))}
      </div>

      <div className="w-px h-6 mx-1" style={{ background: "#e5eadd" }} />

      {/* Formation selector */}
      <div className="flex items-center gap-2">
        <BookOpen size={16} style={{ color: "#1a7149" }} />
        <div
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer"
          style={{ background: "#efefea" }}
        >
          <select
             onChange={(e) => {const value = e.target.value;
              setFormationId(value);
              handleApplyFilters(period, status, value);}}
            className="appearance-none bg-transparent text-sm font-medium outline-none pr-5 cursor-pointer"
            style={{ color: "#2d4a3e", fontFamily: "'DM Sans', sans-serif" }}
          >
            {formations.map((f) => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 pointer-events-none" style={{ color: "#2d4a3e", opacity: 0.5 }} />
        </div>
      </div>

      <div className="w-px h-6 mx-1" style={{ background: "#e5eadd" }} />

      {/* Status filter */}
      <div className="flex items-center gap-2">
        <Filter size={16} style={{ color: "#1a7149" }} />
        <span className="text-sm font-medium" style={{ color: "#2d4a3e", opacity: 0.7 }}>
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
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={
              status === s
                ? { background: "#2d4a3e", color: "#fff" }
                : { background: "#efefea", color: "#2d4a3e" }
            }
          >
            {s}
          </button>
        ))}
      </div>

      {/* Active period badge */}
      <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(26,113,73,0.1)" }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#1a7149" }} />
        <span className="text-xs font-medium" style={{ color: "#1a7149" }}>
          Exercice 2025
        </span>
      </div>
    </div>
  );
}
