"use client";

import { useState, useMemo } from "react";
import {
  Search, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, ShieldAlert,
} from "lucide-react";
import type { RiskSession, RiskLevel, TableFilterState, RiskFilter, ProfitabilityFilter, FillRateFilter } from "../types";

interface RiskTableProps {
  data: RiskSession[];
  loading?: boolean;
}

type SortKey = "riskScore" | "financialImpact" | "fillRate";
type SortDir = "asc" | "desc" | null;

const glassCard = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(229,234,221,0.9)",
};

const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; color: string; dot: string; barColor: string }> = {
  Safe:   { label: "Faible",    bg: "rgba(26,113,73,0.1)",  color: "#1a7149", dot: "#1a7149", barColor: "#1a7149" },
  Medium: { label: "Moyen",     bg: "rgba(217,119,6,0.1)",  color: "#D97706", dot: "#D97706", barColor: "#D97706" },
  High:   { label: "Élevé",     bg: "rgba(220,38,38,0.1)",  color: "#DC2626", dot: "#DC2626", barColor: "#DC2626" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RiskBadge({ status }: { status: RiskLevel }) {
  const cfg = RISK_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function RiskBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const status: RiskLevel = score < 0.3 ? "Safe" : score < 0.7 ? "Medium" : "High";
  const cfg = RISK_CONFIG[status];
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "#e5eadd", minWidth: 72 }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, background: cfg.barColor }}
        />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color: cfg.color }}>
        {score.toFixed(2)}
      </span>
    </div>
  );
}

function FillRateBadge({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color = rate >= 0.7 ? "#1a7149" : rate >= 0.3 ? "#D97706" : "#DC2626";
  const bg   = rate >= 0.7 ? "rgba(26,113,73,0.1)" : rate >= 0.3 ? "rgba(217,119,6,0.1)" : "rgba(220,38,38,0.1)";
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: bg, color }}
    >
      {pct}%
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 rounded animate-pulse" style={{ background: "#e5eadd", width: i === 0 ? "80%" : "60%" }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Chip button (table filters) ──────────────────────────────────────────────
function Chip<T extends string>({
  value,
  active,
  onClick,
  activeColor = "#1a7149",
  activeBg = "rgba(26,113,73,0.12)",
}: {
  value: T;
  active: boolean;
  onClick: () => void;
  activeColor?: string;
  activeBg?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-150"
      style={
        active
          ? { background: activeBg, color: activeColor, border: `1px solid ${activeColor}30` }
          : { background: "#efefea", color: "#2d4a3e", border: "1px solid transparent" }
      }
    >
      {value}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const INITIAL_TABLE_FILTERS: TableFilterState = {
  risk: "Tout",
  profitability: "Tout",
  fillRate: "Tout",
};

export default function RiskTable({ data, loading = false }: RiskTableProps) {
  const [search, setSearch]       = useState("");
  const [sortKey, setSortKey]     = useState<SortKey | null>(null);
  const [sortDir, setSortDir]     = useState<SortDir>(null);
  const [page, setPage]           = useState(1);
  const [tableFilters, setTableFilters] = useState<TableFilterState>(INITIAL_TABLE_FILTERS);
  const perPage = 5;

  // ── helpers ──────────────────────────────────────────────────────────────
  function setTF<K extends keyof TableFilterState>(key: K, val: TableFilterState[K]) {
    setTableFilters((prev) => ({ ...prev, [key]: val }));
    setPage(1);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
      else setSortDir("asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={13} className="opacity-30" />;
    return sortDir === "asc"
      ? <ArrowUp size={13} style={{ color: "#1a7149" }} />
      : <ArrowDown size={13} style={{ color: "#1a7149" }} />;
  }

  const activeFilterCount = [
    tableFilters.risk !== "Tout",
    tableFilters.profitability !== "Tout",
    tableFilters.fillRate !== "Tout",
  ].filter(Boolean).length;

  // ── filtering + sorting ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = [...data];

    // text search
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) => r.sessionName.toLowerCase().includes(q) || r.formation.toLowerCase().includes(q)
      );
    }

    // risk filter
    if (tableFilters.risk !== "Tout") {
      rows = rows.filter((r) => {
        if (tableFilters.risk === "Faible")  return r.riskScore < 0.3;
        if (tableFilters.risk === "Moyen")   return r.riskScore >= 0.3 && r.riskScore < 0.7;
        if (tableFilters.risk === "Élevé")   return r.riskScore >= 0.7;
        return true;
      });
    }

    // profitability filter
    if (tableFilters.profitability !== "Tout") {
      rows = rows.filter((r) =>
        tableFilters.profitability === "Rentable" ? r.profitable : !r.profitable
      );
    }

    // fill rate filter
    if (tableFilters.fillRate !== "Tout") {
      rows = rows.filter((r) => {
        if (tableFilters.fillRate === "Faible") return r.fillRate < 0.3;
        if (tableFilters.fillRate === "Moyen")  return r.fillRate >= 0.3 && r.fillRate < 0.7;
        if (tableFilters.fillRate === "Élevé")  return r.fillRate >= 0.7;
        return true;
      });
    }

    // sort
    if (sortKey && sortDir) {
      rows.sort((a, b) => sortDir === "asc" ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]);
    }

    return rows;
  }, [data, search, tableFilters, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="rounded-2xl overflow-hidden" style={glassCard}>

      {/* ── Main header ──────────────────────────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b"
        style={{ borderColor: "#e5eadd" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(220,38,38,0.1)" }}
          >
            <ShieldAlert size={18} style={{ color: "#DC2626" }} />
          </div>
          <div>
            <h3 className="text-base font-bold font-sora" style={{ color: "#2d4a3e" }}>
              Sessions à Risque
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "#2d4a3e", opacity: 0.45 }}>
              {filtered.length} session{filtered.length !== 1 ? "s" : ""} correspondante{filtered.length !== 1 ? "s" : ""}
              {activeFilterCount > 0 && (
                <span
                  className="ml-2 px-1.5 py-0.5 rounded-md text-xs font-semibold"
                  style={{ background: "rgba(26,113,73,0.1)", color: "#1a7149" }}
                >
                  {activeFilterCount} filtre{activeFilterCount > 1 ? "s" : ""} actif{activeFilterCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{ background: "#efefea", borderColor: "#e5eadd" }}
        >
          <Search size={15} style={{ color: "#2d4a3e", opacity: 0.4 }} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm outline-none w-36"
            style={{ color: "#2d4a3e", fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>
      </div>

      {/* ── Table-specific filters ────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 border-b"
        style={{ background: "rgba(239,239,234,0.35)", borderColor: "#e5eadd" }}
      >

        {/* Risk level chips */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2d4a3e", opacity: 0.4 }}>
            Risque
          </span>
          <div className="flex gap-1">
            {(["Tout", "Faible", "Moyen", "Élevé"] as RiskFilter[]).map((v) => (
              <Chip
                key={v}
                value={v}
                active={tableFilters.risk === v}
                onClick={() => setTF("risk", v)}
                activeColor={v === "Élevé" ? "#DC2626" : v === "Moyen" ? "#D97706" : "#1a7149"}
                activeBg={v === "Élevé" ? "rgba(220,38,38,0.1)" : v === "Moyen" ? "rgba(217,119,6,0.1)" : "rgba(26,113,73,0.1)"}
              />
            ))}
          </div>
        </div>

        <div className="w-px h-4 shrink-0" style={{ background: "#e5eadd" }} />

        {/* Profitability chips */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2d4a3e", opacity: 0.4 }}>
            Rentabilité
          </span>
          <div className="flex gap-1">
            {(["Tout", "Rentable", "Non rentable"] as ProfitabilityFilter[]).map((v) => (
              <Chip
                key={v}
                value={v}
                active={tableFilters.profitability === v}
                onClick={() => setTF("profitability", v)}
                activeColor={v === "Non rentable" ? "#DC2626" : "#1a7149"}
                activeBg={v === "Non rentable" ? "rgba(220,38,38,0.1)" : "rgba(26,113,73,0.1)"}
              />
            ))}
          </div>
        </div>

        <div className="w-px h-4 shrink-0" style={{ background: "#e5eadd" }} />

        {/* Fill rate chips */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2d4a3e", opacity: 0.4 }}>
            Taux remplissage
          </span>
          <div className="flex gap-1">
            {(["Tout", "Faible", "Moyen", "Élevé"] as FillRateFilter[]).map((v) => (
              <Chip
                key={v}
                value={v}
                active={tableFilters.fillRate === v}
                onClick={() => setTF("fillRate", v)}
                activeColor={v === "Faible" ? "#DC2626" : v === "Moyen" ? "#D97706" : "#1a7149"}
                activeBg={v === "Faible" ? "rgba(220,38,38,0.1)" : v === "Moyen" ? "rgba(217,119,6,0.1)" : "rgba(26,113,73,0.1)"}
              />
            ))}
          </div>
        </div>

        {/* Reset */}
        {activeFilterCount > 0 && (
          <>
            <div className="w-px h-4 shrink-0" style={{ background: "#e5eadd" }} />
            <button
              onClick={() => { setTableFilters(INITIAL_TABLE_FILTERS); setPage(1); }}
              className="text-xs font-medium transition-all hover:opacity-80"
              style={{ color: "#DC2626" }}
            >
              Réinitialiser
            </button>
          </>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "rgba(229,234,221,0.3)" }}>
              {[
                { label: "Session",          key: null },
                { label: "Formation",        key: null },
                { label: "Score Risque",     key: "riskScore" as SortKey },
                { label: "Taux Remplissage", key: "fillRate" as SortKey },
                { label: "Impact Financier", key: "financialImpact" as SortKey },
                { label: "Rentabilité",      key: null },
                { label: "Statut",           key: null },
              ].map((col, i) => (
                <th
                  key={i}
                  className={`text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide ${col.key ? "cursor-pointer select-none" : ""}`}
                  style={{ color: "#2d4a3e", opacity: 0.55 }}
                  onClick={() => col.key && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    {col.key && <SortIcon col={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "rgba(229,234,221,0.6)" }}>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : paged.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-sm" style={{ color: "#2d4a3e", opacity: 0.4 }}>
                    Aucune session ne correspond aux filtres
                  </td>
                </tr>
              )
              : paged.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-white/50 transition-colors duration-150"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold" style={{ color: "#2d4a3e" }}>{row.sessionName}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{ background: "#efefea", color: "#2d4a3e" }}
                    >
                      {row.formation}
                    </span>
                  </td>
                  <td className="px-5 py-4 min-w-[140px]">
                    <RiskBar score={row.riskScore} />
                  </td>
                  <td className="px-5 py-4">
                    <FillRateBadge rate={row.fillRate} />
                  </td>
                  <td className="px-5 py-4 font-semibold" style={{ color: "#2d4a3e" }}>
                    {new Intl.NumberFormat("fr-TN", {
                      style: "currency",
                      currency: "TND",
                      minimumFractionDigits: 0,
                    }).format(row.financialImpact)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={
                        row.profitable
                          ? { background: "rgba(26,113,73,0.1)", color: "#1a7149" }
                          : { background: "rgba(220,38,38,0.1)", color: "#DC2626" }
                      }
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: row.profitable ? "#1a7149" : "#DC2626" }}
                      />
                      {row.profitable ? "Rentable" : "Non rentable"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <RiskBadge status={row.status} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-5 py-3 border-t"
          style={{ borderColor: "#e5eadd" }}
        >
          <p className="text-xs" style={{ color: "#2d4a3e", opacity: 0.45 }}>
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white transition-all"
              style={{ color: "#2d4a3e" }}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className="w-7 h-7 rounded-lg text-xs font-medium transition-all"
                style={
                  page === i + 1
                    ? { background: "#1a7149", color: "#fff" }
                    : { color: "#2d4a3e" }
                }
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white transition-all"
              style={{ color: "#2d4a3e" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
