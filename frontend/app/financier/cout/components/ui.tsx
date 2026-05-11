"use client";

import React from "react";
import type { RentabiliteStatut } from "../types";

// ── Design tokens ──────────────────────────────────────────
export const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(229,234,221,0.9)",
};

export const glassPanel: React.CSSProperties = {
  background: "rgba(255,255,255,0.45)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(229,234,221,0.7)",
};

export function fmtCurrency(v: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency", currency: "TND", minimumFractionDigits: 0,
  }).format(v);
}

export function fmtNumber(v: number) {
  return new Intl.NumberFormat("fr-FR").format(v);
}

// ── Rentabilité badge ──────────────────────────────────────
const RENT_MAP: Record<RentabiliteStatut, { bg: string; color: string; dot: string; icon: string }> = {
  rentable:       { bg: "rgba(26,113,73,0.12)",  color: "#1a7149", dot: "#1a7149", icon: "🟢" },
  "seuil":{ bg: "rgba(217,119,6,0.12)",  color: "#D97706", dot: "#D97706", icon: "🟡" },
  deficitaire:    { bg: "rgba(220,38,38,0.10)",  color: "#DC2626", dot: "#DC2626", icon: "🔴" },
};

export function RentabiliteBadge({ statut }: { statut: RentabiliteStatut }) {
  const s = RENT_MAP[statut];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {statut}
    </span>
  );
}

// ── Avatar initiales ──────────────────────────────────────
const AVATAR_COLORS = ["#1a7149","#2d4a3e","#3b82f6","#D97706","#8b5cf6","#DC2626","#4a9e7a"];
export function Avatar({
  initiales, couleur, size = 32,
}: { initiales: string; couleur?: string; size?: number }) {
  const bg = couleur ?? AVATAR_COLORS[0];
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-xl font-semibold text-white"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.33 }}
    >
      {initiales}
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────
export function KPICard({
  label, value, sub, accentColor = "#1a7149",
  badge, valueColor, icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accentColor?: string;
  badge?: React.ReactNode;
  valueColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="relative rounded-2xl p-5 flex flex-col gap-3 hover:-translate-y-0.5 transition-all duration-300"
      style={glassCard}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: accentColor }} />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${accentColor}18` }}
            >
              {icon}
            </div>
          )}
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#2d4a3e", opacity: 0.5 }}>
            {label}
          </p>
        </div>
        {badge}
      </div>
      <p className="text-2xl font-bold" style={{ color: valueColor || "#2d4a3e", fontFamily: "'Sora', sans-serif" }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: "#2d4a3e", opacity: 0.45, borderTop: "1px solid #e5eadd", paddingTop: 8 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Section title ──────────────────────────────────────────
export function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-bold" style={{ color: "#2d4a3e", fontFamily: "'Sora', sans-serif" }}>
        {title}
      </h3>
      {sub && <p className="text-xs mt-0.5" style={{ color: "#2d4a3e", opacity: 0.45 }}>{sub}</p>}
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────
export function ProgressBar({
  value, max, color = "#1a7149", height = 6,
}: { value: number; max: number; color?: string; height?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: "#e5eadd" }}>
      <div
        className="rounded-full h-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ── Filter select ──────────────────────────────────────────
export function FilterSelect({
  label, value, onChange, options,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border relative"
      style={{ background: "#efefea", borderColor: "#e5eadd" }}
    >
      {label && (
        <span className="text-xs font-medium flex-shrink-0" style={{ color: "#2d4a3e", opacity: 0.6 }}>
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-transparent text-sm outline-none pr-5 cursor-pointer"
        style={{ color: "#2d4a3e", fontFamily: "'DM Sans', sans-serif" }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg
        className="absolute right-2 pointer-events-none"
        width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="#2d4a3e" strokeOpacity="0.4" strokeWidth="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

// ── Search box ─────────────────────────────────────────────
export function SearchBox({
  value, onChange, placeholder = "Rechercher...",
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border"
      style={{ background: "#efefea", borderColor: "#e5eadd" }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="6.5" cy="6.5" r="5" stroke="#2d4a3e" strokeOpacity="0.4" strokeWidth="1.5" />
        <path d="M10.5 10.5L14 14" stroke="#2d4a3e" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent text-sm outline-none w-44"
        style={{ color: "#2d4a3e", fontFamily: "'DM Sans', sans-serif" }}
      />
    </div>
  );
}

// ── Export button ──────────────────────────────────────────
type Props = {
  data: any[];
};

export function ExportBtn({ data }: Props) {

  const handleExport = () => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);

  const csv = [
    headers.join(","),
    ...data.map(row =>
      headers.map(h => `"${row[h] ?? ""}"`).join(",")
    )
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "cout_sessions.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  
  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all hover:shadow-sm"
      style={{ background: "#efefea", borderColor: "#e5eadd", color: "#2d4a3e" }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Exporter CSV
    </button>
  );
}
