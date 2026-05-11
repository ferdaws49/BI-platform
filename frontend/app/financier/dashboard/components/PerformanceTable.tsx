"use client";

import { useState, useMemo } from "react";
import {
  Search, ArrowUpDown, ArrowUp, ArrowDown,
  TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight,
} from "lucide-react";

import type { PaymentStatus, SessionRow  } from "../types";

interface PerformanceTableProps {
  data: SessionRow[];
}

type SortKey = keyof Pick<SessionRow, "caEncaisse" | "cout" | "margeNette" | "roi">;
type SortDir = "asc" | "desc" | null;

const glassCard = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(229,234,221,0.9)",
}

function StatusPill({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, { label: string, bg: string; color: string; dot: string }> = {
    Paye: {label: "Payé " , bg: "rgba(26,113,73,0.1)", color: "#1a7149", dot: "#1a7149" },
    Avance: {label: "Avance" ,  bg: "rgba(59,130,246,0.1)", color: "#3b82f6", dot: "#3b82f6" },
    Impaye: {label: "Impayé" , bg: "rgba(220,38,38,0.1)", color: "#DC2626", dot: "#DC2626" },
  };
  const s = map[status] || { 
    label: status, 
    bg: "#efefea", 
    color: "#2d4a3e", 
    dot: "#2d4a3e" 
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

function ROIBadge({ value, trend }: { value: number; trend: SessionRow["roiTrend"] }) {
  const icon = trend === "up" ? <TrendingUp size={13} /> : trend === "down" ? <TrendingDown size={13} /> : <Minus size={13} />;
  const color = trend === "up" ? "#1a7149" : trend === "down" ? "#DC2626" : "#2d4a3e";
  const bg = trend === "up" ? "rgba(26,113,73,0.1)" : trend === "down" ? "rgba(220,38,38,0.1)" : "rgba(45,74,62,0.1)";
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: bg, color }}>
      {icon} {Math.round(value)}%
    </span>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 0 }).format(value);
}

export default function PerformanceTable({ data }: PerformanceTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);
  const perPage = 5;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={13} className="opacity-30" />;
    return sortDir === "asc" ? <ArrowUp size={13} style={{ color: "#1a7149" }} /> : <ArrowDown size={13} style={{ color: "#1a7149" }} />;
  }

  const filtered = useMemo(() => {
    let rows = [...data];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) => r.session.toLowerCase().includes(q) || r.formation.toLowerCase().includes(q)
      );
    }
    if (sortKey && sortDir) {
      rows.sort((a, b) => sortDir === "asc" ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]);
    }
    return rows;
  }, [data, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="rounded-2xl overflow-hidden" style={glassCard}>
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b"
        style={{ borderColor: "#e5eadd" }}
      >
        <div>
          <h3 className="text-base font-bold font-sora" style={{ color: "#2d4a3e" }}>
            Performance des Sessions
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "#2d4a3e", opacity: 0.45 }}>
            {filtered.length} session{filtered.length > 1 ? "s" : ""} trouvée{filtered.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{ background: "#efefea", borderColor: "#e5eadd" }}
        >
          <Search size={15} style={{ color: "#2d4a3e", opacity: 0.4 }} />
          <input
            type="text"
            placeholder="Rechercher une session..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm outline-none w-44"
            style={{ color: "#2d4a3e", fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "rgba(229,234,221,0.3)" }}>
              {[
                { label: "Session", key: null },
                { label: "Inscrits", key: null },
                { label: "CA Encaissé", key: "caEncaisse" as SortKey },
                { label: "Coût", key: "cout" as SortKey },
                { label: "Marge Nette", key: "margeNette" as SortKey },
                { label: "ROI", key: "roi" as SortKey },
                { label: "Statut", key: null },
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
          <tbody className="divide-y" style={{ borderColor: "#e5eadd" }}>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-sm" style={{ color: "#2d4a3e", opacity: 0.4 }}>
                  Aucune session trouvée
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={row.sessionId}
                  className="hover:bg-white/50 transition-colors duration-150"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold" style={{ color: "#2d4a3e" }}>{row.session}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#2d4a3e", opacity: 0.45 }}>
                      {row.formation} · {row.date ? new Date(row.date).toLocaleDateString('fr-FR'): 'Date inconnue'}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold" style={{ color: "#2d4a3e" }}>
                        {row.inscrits|| 0}/{row.capacite || 0}
                      </span>
                      <div className="w-16 h-1.5 rounded-full" style={{ background: "#e5eadd" }}>
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${row.capacite  && row.capacite ? (row.inscrits / row.capacite) * 100 : 0}%`,
                            background: row.inscrits / (row.capacite ||1) >= 0.8 ? "#1a7149" : "#D97706",
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold" style={{ color: "#2d4a3e" }}>
                    {(row.caEncaisse?? 0).toLocaleString()} TND
                  </td>
                  <td className="px-5 py-4" style={{ color: "#DC2626" }}>
                    {formatCurrency(row.cout ?? 0)}
                  </td>
                  <td className="px-5 py-4 font-bold" style={{ color: "#1a7149" }}>
                    {(row.margeNette?? 0).toLocaleString()} TND
                  </td>
                  <td className="px-5 py-4">
                    <ROIBadge value={row.roi ?? 0} trend={row.roiTrend} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill status={row.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
              className="p-1.5 rounded-lg disabled:opacity-30 transition-all hover:bg-white"
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
              className="p-1.5 rounded-lg disabled:opacity-30 transition-all hover:bg-white"
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
