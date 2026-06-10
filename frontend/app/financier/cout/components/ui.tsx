"use client";

import React from "react";
import { Download } from "lucide-react";
import type { RentabiliteStatut } from "../types";

/** Conteneur card aligné sur le design system global */
export const cardClass =
  "rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow";

export const glassCard: React.CSSProperties = {};
export const glassPanel: React.CSSProperties = {};

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
    <div className={`relative p-4 flex flex-col gap-3 ${cardClass}`}>
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
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
        </div>
        {badge}
      </div>
      <p className={`text-2xl font-bold ${valueColor ? "" : "text-foreground"}`} style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-muted-foreground border-t border-border pt-2">
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
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {sub && <p className="text-xs mt-0.5 text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────
export function ProgressBar({
  value, max, color = "#1a7149", height = 6,
}: { value: number; max: number; color?: string; height?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full rounded-full overflow-hidden bg-border" style={{ height }}>
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
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-secondary relative">
      {label && (
        <span className="text-xs font-medium flex-shrink-0 text-muted-foreground">
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-transparent text-sm outline-none pr-5 cursor-pointer text-foreground"
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
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-secondary">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="6.5" cy="6.5" r="5" stroke="#2d4a3e" strokeOpacity="0.4" strokeWidth="1.5" />
        <path d="M10.5 10.5L14 14" stroke="#2d4a3e" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent text-sm outline-none w-44 text-foreground"
      />
    </div>
  );
}

// ── Export button ──────────────────────────────────────────
interface ExportBtnProps {
  data?: any[];
  onClick?: () => Promise<void>;
  label?: string;
}

export function ExportBtn({ data, onClick, label = "Exporter" }: ExportBtnProps) {
  const handleClick = async () => {
    if (onClick) {
      await onClick();
      return;
    }

    if (!data || data.length === 0) return;

    // Génération CSV client-side (fallback)
    const headers = Object.keys(data[0]).join(";");
    const rows = data.map((row) =>
      Object.values(row)
        .map((val) => {
          const str = String(val ?? "");
          if (str.includes(";") || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
          return str;
        })
        .join(";")
    );

    const csv = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
      style={{ background: "#1a7149", color: "#fff" }}
    >
      <Download size={13} />
      {label}
    </button>
  );

}
