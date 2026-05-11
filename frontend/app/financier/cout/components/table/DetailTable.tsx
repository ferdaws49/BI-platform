"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  glassCard, fmtCurrency, RentabiliteBadge,
  SearchBox, ExportBtn,
} from "../ui";
import type { PaginationMeta, SessionCoutRow } from "../../types";

// ── Remplissage badge ─────────────────────────────────────
function RemplissageBadge({ pct }: { pct: number }) {
  const color = pct >= 70 ? "#1a7149" : pct >= 50 ? "#D97706" : "#DC2626";
  return (
    <div className="flex flex-col gap-1.5 w-24">
      <span className="text-xs font-semibold" style={{ color }}>{pct}%</span>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#e5eadd" }}>
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Sortable header ────────────────────────────────────────
type SortKey = "coutTotal" | "coutDirectFormateur" | "fraisAnnexes" | "marge" | "inscrits";
type SortDir = "asc" | "desc";

function SortTh({
  label, col, sortKey, sortDir, onSort, right = false,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (c: SortKey) => void;
  right?: boolean;
}) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none ${right ? "text-right" : "text-left"}`}
      style={{ color: "#2d4a3e", opacity: active ? 1 : 0.5 }}
    >
      <span className={`flex items-center gap-1 ${right ? "justify-end" : ""}`}>
        {label}
        <span style={{ opacity: active ? 1 : 0.3 }}>
          {active
            ? sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
            : <ArrowUpDown size={11} />}
        </span>
      </span>
    </th>
  );
}

// ─────────────────────────────────────────────────────────────
// Props
//
// rows        — the current page of rows returned by the backend (already
//               sliced; do NOT re-paginate them here).
// pagination  — page metadata from the backend (total, totalPages, etc.).
// onPageChange — callback to update filters.page in the parent, which
//               triggers a new API fetch for the requested page.
// ─────────────────────────────────────────────────────────────
interface Props {
  rows: SessionCoutRow[];
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

export default function DetailTable({ rows, pagination, onPageChange }: Props) {
  // Client-side search filters within the current page only.
  // Full cross-page search would require a backend search param — acceptable
  // limitation; add a search query param to CostFilterDto if needed later.
  const [search,  setSearch]  = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Filter the current page's rows by the search term
  const searched = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.sessionNom.toLowerCase().includes(q) ||
        r.formation.toLowerCase().includes(q) ||
        r.formateur.toLowerCase().includes(q),
    );
  }, [rows, search]);

  // Client-side sort within the current page (the backend already sorted
  // the full dataset; this lets the user re-sort the visible slice instantly
  // without an extra round-trip).
  const sorted = useMemo(() => {
    if (!sortKey) return searched;
    return [...searched].sort((a, b) => {
      const va = a[sortKey] as number;
      const vb = b[sortKey] as number;
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [searched, sortKey, sortDir]);

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(col); setSortDir("desc"); }
  }

  // Totals across the visible (searched + sorted) rows
  const totals = useMemo(
    () => ({
      coutDirect:   sorted.reduce((s, r) => s + r.coutDirectFormateur, 0),
      fraisAnnexes: sorted.reduce((s, r) => s + r.fraisAnnexes, 0),
      coutTotal:    sorted.reduce((s, r) => s + r.coutTotal, 0),
      ca:           sorted.reduce((s, r) => s + r.ca, 0),
      marge:        sorted.reduce((s, r) => s + r.marge, 0),
    }),
    [sorted],
  );

  const { page, totalPages, total } = pagination;

  return (
    <div className="rounded-2xl overflow-hidden" style={glassCard}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b"
        style={{ borderColor: "#e5eadd" }}
      >
        <div>
          <p className="font-bold text-sm" style={{ color: "#2d4a3e", fontFamily: "'Sora', sans-serif" }}>
            Détail des Coûts par Session
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#2d4a3e", opacity: 0.4 }}>
            {total} session{total > 1 ? "s" : ""} au total · page {page}/{totalPages}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SearchBox
            value={search}
            onChange={(v) => setSearch(v)}
            placeholder="Session, formation, formateur..."
          />
          <ExportBtn data={sorted} />
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "rgba(229,234,221,0.4)" }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#2d4a3e", opacity: 0.5 }}>
                Formation / Session
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#2d4a3e", opacity: 0.5 }}>
                Formateur
              </th>
              <SortTh label="Coût Direct"   col="coutDirectFormateur" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} right />
              <SortTh label="Frais Annexes" col="fraisAnnexes"        sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} right />
              <SortTh label="Coût Total"    col="coutTotal"           sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} right />
              <SortTh label="Marge"         col="marge"               sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} right />
              <SortTh label="Remplissage"   col="inscrits"            sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#2d4a3e", opacity: 0.5 }}>
                Statut
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-sm" style={{ color: "#2d4a3e", opacity: 0.35 }}>
                  Aucune session trouvée
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const remplissagePct = Math.round(
                  row.capacite > 0 ? (row.inscrits / row.capacite) * 100 : 0,
                );
                const margeColor =
                  row.marge > 0 ? "#1a7149" : row.marge === 0 ? "#D97706" : "#DC2626";

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-white/50 transition-colors border-t"
                    style={{ borderColor: "#e5eadd" }}
                  >
                    {/* Formation / Session */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold" style={{ color: "#2d4a3e" }}>
                        {row.sessionNom}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#2d4a3e", opacity: 0.45 }}>
                        {row.formation}
                        {row.dateDebut ? ` · ${row.dateDebut}` : ""}
                      </p>
                    </td>

                    {/* Formateur */}
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-1 rounded-lg font-medium"
                        style={{ background: "rgba(45,74,62,0.08)", color: "#2d4a3e" }}
                      >
                        {row.formateur.split(" ")[0]}
                      </span>
                    </td>

                    {/* Coût direct */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-semibold" style={{ color: "#D97706" }}>
                        {fmtCurrency(row.coutDirectFormateur)}
                      </span>
                    </td>

                    {/* Frais annexes */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs" style={{ color: "#2d4a3e", opacity: 0.65 }}>
                        {fmtCurrency(row.fraisAnnexes)}
                      </span>
                    </td>

                    {/* Coût total */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-bold" style={{ color: "#DC2626" }}>
                        {fmtCurrency(row.coutTotal ?? 0)}
                      </span>
                    </td>

                    {/* Marge */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xs font-bold" style={{ color: margeColor }}>
                          {row.marge >= 0 ? "+" : ""}{fmtCurrency(row.marge ?? 0)}
                        </span>
                        <span className="text-xs" style={{ color: "#2d4a3e", opacity: 0.4 }}>
                          CA : {fmtCurrency(row.ca)}
                        </span>
                      </div>
                    </td>

                    {/* Remplissage */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <RemplissageBadge pct={remplissagePct} />
                        <span className="text-xs" style={{ color: "#2d4a3e", opacity: 0.4 }}>
                          {row.inscrits}/{row.capacite} inscrits
                        </span>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-3">
                      <RentabiliteBadge statut={row.statut} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Totals footer */}
          {sorted.length > 0 && (
            <tfoot>
              <tr style={{ background: "rgba(45,74,62,0.05)", borderTop: "1px solid #e5eadd" }}>
                <td className="px-4 py-3" colSpan={2}>
                  <span className="text-xs font-bold" style={{ color: "#2d4a3e" }}>
                    Total ({sorted.length} sur cette page)
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-bold" style={{ color: "#D97706" }}>
                    {fmtCurrency(totals.coutDirect)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-bold" style={{ color: "#2d4a3e", opacity: 0.7 }}>
                    {fmtCurrency(totals.fraisAnnexes)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-bold" style={{ color: "#DC2626" }}>
                    {fmtCurrency(totals.coutTotal)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className="text-xs font-bold"
                    style={{ color: totals.marge >= 0 ? "#1a7149" : "#DC2626" }}
                  >
                    {totals.marge >= 0 ? "+" : ""}{fmtCurrency(totals.marge)}
                  </span>
                </td>
                <td className="px-4 py-3" colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Pagination (backend-driven) ─────────────────────── */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-5 py-3 border-t"
          style={{ borderColor: "#e5eadd" }}
        >
          <span className="text-xs" style={{ color: "#2d4a3e", opacity: 0.4 }}>
            Page {page}/{totalPages} · {total} résultats
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="w-7 h-7 rounded-lg text-xs transition-all disabled:opacity-30"
              style={{ color: "#2d4a3e" }}
            >
              ‹
            </button>

            {/* Show at most 7 page buttons to avoid overflow */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                return Math.abs(p - page) <= 2;
              })
              .map((p, idx, arr) => {
                // Insert an ellipsis gap when page numbers are non-contiguous
                const prev = arr[idx - 1];
                const showEllipsis = prev !== undefined && p - prev > 1;
                return (
                  <span key={p} className="flex items-center gap-1">
                    {showEllipsis && (
                      <span className="text-xs px-1" style={{ color: "#2d4a3e", opacity: 0.35 }}>
                        …
                      </span>
                    )}
                    <button
                      onClick={() => onPageChange(p)}
                      className="w-7 h-7 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: page === p ? "#1a7149" : "transparent",
                        color:      page === p ? "#fff"    : "#2d4a3e",
                      }}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="w-7 h-7 rounded-lg text-xs transition-all disabled:opacity-30"
              style={{ color: "#2d4a3e" }}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
