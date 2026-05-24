"use client";

import { useState } from "react";
import { CalendarDays, BookOpen, Users, Monitor, ChevronDown } from "lucide-react";
import type { FilterState, PeriodOption, Formation, Formateur } from "../types";

interface FiltersBarProps {
  formations: Formation[];
  formateurs: Formateur[];
  onFilterChange: (filters: FilterState) => void;
}

const glassStyle = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(229,234,221,0.9)",
};

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
      <div
        className="relative flex items-center px-3 py-1.5 rounded-lg"
        style={{ background: "#efefea" }}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-transparent text-sm font-medium outline-none pr-6 cursor-pointer"
          style={{ color: "#2d4a3e", fontFamily: "'DM Sans', sans-serif" }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown
          size={13}
          className="absolute right-2 pointer-events-none"
          style={{ color: "#2d4a3e", opacity: 0.45 }}
        />
      </div>
    </div>
  );
}

const DIVIDER = <div className="w-px h-6 mx-1 shrink-0" style={{ background: "#e5eadd" }} />;

const PERIODS: PeriodOption[] = ["Mois", "Trimestre", "Année", "Personnalisé"];

export default function FiltersBar({ formations, formateurs, onFilterChange }: FiltersBarProps) {
  const [period, setPeriod] = useState<PeriodOption>("Mois");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [formationId, setFormationId] = useState("all");
  const [formateurId, setFormateurId] = useState("all");
  const [sessionType, setSessionType] = useState<FilterState["sessionType"]>("Tout");

  function apply(overrides: Partial<FilterState> = {}) {
    onFilterChange({
      period,
      dateFrom,
      dateTo,
      formationId,
      formateurId,
      sessionType,
      ...overrides,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-2xl"
        style={glassStyle}
      >
        {/* ── Période ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <CalendarDays size={16} style={{ color: "#1a7149" }} />
          <span className="text-sm font-medium" style={{ color: "#2d4a3e", opacity: 0.7 }}>
            Période :
          </span>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); apply({ period: p }); }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={
                period === p
                  ? { background: "#1a7149", color: "#fff" }
                  : { background: "#efefea", color: "#2d4a3e" }
              }
            >
              {p}
            </button>
          ))}
        </div>

        {/* ── Date range (visible only when Personnalisé) ──────────────── */}
        {period === "Personnalisé" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); apply({ dateFrom: e.target.value }); }}
              className="px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{
                background: "#efefea",
                color: "#2d4a3e",
                border: "1px solid #e5eadd",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <span className="text-xs" style={{ color: "#2d4a3e", opacity: 0.4 }}>→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); apply({ dateTo: e.target.value }); }}
              className="px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{
                background: "#efefea",
                color: "#2d4a3e",
                border: "1px solid #e5eadd",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>
        )}

        {DIVIDER}

        {/* ── Formation ────────────────────────────────────────────────── */}
        <SelectDropdown
          icon={BookOpen}
          value={formationId}
          onChange={(v) => { setFormationId(v); apply({ formationId: v }); }}
          options={formations.map((f) => ({ value: f.id, label: f.title }))}
        />

        {DIVIDER}

        {/* ── Formateur ────────────────────────────────────────────────── */}
        <SelectDropdown
          icon={Users}
          value={formateurId}
          onChange={(v) => { setFormateurId(v); apply({ formateurId: v }); }}
          options={formateurs.map((f) => ({ value: f.id, label: f.name }))}
        />

        {DIVIDER}

        {/* ── Type de session ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <Monitor size={16} style={{ color: "#1a7149" }} />
          <span className="text-sm font-medium" style={{ color: "#2d4a3e", opacity: 0.7 }}>
            Type :
          </span>
        </div>
        <div className="flex gap-1">
          {(["Tout", "En ligne", "Présentiel"] as FilterState["sessionType"][]).map((s) => (
            <button
              key={s}
              onClick={() => { setSessionType(s); apply({ sessionType: s }); }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={
                sessionType === s
                  ? { background: "#2d4a3e", color: "#fff" }
                  : { background: "#efefea", color: "#2d4a3e" }
              }
            >
              {s}
            </button>
          ))}
        </div>

        {/* ── Badge exercice ───────────────────────────────────────────── */}
        <div
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0"
          style={{ background: "rgba(26,113,73,0.1)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#1a7149" }} />
          <span className="text-xs font-medium" style={{ color: "#1a7149" }}>
            Exercice 2025
          </span>
        </div>
      </div>
    </div>
  );
}
