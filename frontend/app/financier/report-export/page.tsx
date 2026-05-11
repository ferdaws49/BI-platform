"use client";

import { useState, useRef, useEffect } from "react";
import {
  FileText, BarChart2, Calendar,
  Eye, FileDown, TableIcon,
  TrendingUp, TrendingDown,
  CheckCircle2, AlertTriangle, XCircle,
  Building2, Printer, Download,
} from "lucide-react";
import DashboardLayout from "@/components/layout/financier/DashboardLayout";
import{ fetchReportPreview, exportReport } from "@/lib/financier-reporting.api";
import type { ReportResponse } from "@/lib/financier-reporting.api";



// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS  (same charte graphique as the main dashboard)
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  dark:    "#2d4a3e",
  primary: "#1a7149",
  light:   "#f9f8f3",
  input:   "#efefea",
  accent:  "#e5eadd",
  error:   "#DC2626",
  warning: "#D97706",
};

const glass: React.CSSProperties = {
  background:           "rgba(255,255,255,0.65)",
  backdropFilter:       "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border:               "1px solid rgba(229,234,221,0.9)",
};

const glassSelected: React.CSSProperties = {
  background:           "rgba(26,113,73,0.07)",
  backdropFilter:       "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border:               `2px solid ${C.primary}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type ReportType = "mensuel" | "trimestriel" | "annuel";
const TYPE_TO_PERIOD: Record<ReportType, "current_month" | "current_quarter" | "current_year"> = {
  mensuel:     "current_month",
  trimestriel: "current_quarter",
  annuel:      "current_year",
};
// Labels affichés
const TYPE_LABELS: Record<ReportType, string> = {
  mensuel:     "Rapport Mensuel",
  trimestriel: "Rapport Trimestriel",
  annuel:      "Rapport Annuel",
};
type Statut     = "Rentable" | "Seuil atteint" | "Déficitaire";

function backendStatusToFr(status: string): Statut {
  if (status === "rentable")    return "Rentable";
  if (status === "seuil")       return "Seuil atteint";
  return "Déficitaire";
}

interface SessionRow {
  session:     string;
  formation:   string;
  inscrits:    number;
  capacite:    number;
  ca:          number;
  cout:        number;
  marge:       number;
  fillRate:  number;
  statut:      Statut;
}

interface ReportData {
  ca:               number;
  caPct:            number;
  cout:             number;
  coutPct:          number;
  marge:            number;
  margePct:         number;
  recouvrement:     number;
  recouvrementPct:  number;
  sessions:         SessionRow[];
}

function mapResponse(res: ReportResponse): ReportData {
  return {
    ca:              res.kpis.revenue,
    caPct:           res.kpis.performanceVsPreviousPeriod,
    cout:            res.kpis.cost,
    coutPct:         0,
    marge:           res.kpis.margin,
    margePct:        0,
    recouvrement:    res.kpis.recoveryRate,
    recouvrementPct: 0,
    sessions: res.sessions.map(s => ({
      session:   s.sessionName,
      formation: s.formationName,
      inscrits:  s.inscrits,
      capacite:  s.capacite,
      ca:        s.revenue,
      cout:      s.cost,
      marge:     s.margin,
      fillRate:  s.fillRate,
      statut:    backendStatusToFr(s.status),
    })),
  };
}




// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 0 }).format(v);

const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

// ─────────────────────────────────────────────────────────────────────────────
// SMALL ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function PctBadge({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: pos ? "rgba(26,113,73,0.12)" : "rgba(220,38,38,0.1)",
        color:      pos ? C.primary : C.error,
      }}
    >
      {pos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {fmtPct(value)}
    </span>
  );
}

function StatutBadge({ statut }: { statut: Statut }) {
  const cfg: Record<Statut, { bg: string; color: string; dot: string; Icon: any }> = {
    "Rentable":      { bg: "rgba(26,113,73,0.12)",  color: C.primary, dot: C.primary, Icon: CheckCircle2  },
    "Seuil atteint": { bg: "rgba(217,119,6,0.12)",  color: C.warning, dot: C.warning, Icon: AlertTriangle },
    "Déficitaire":   { bg: "rgba(220,38,38,0.10)",  color: C.error,   dot: C.error,   Icon: XCircle       },
  };
  const s = cfg[statut];
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

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 70 ? C.primary : pct >= 50 ? C.warning : C.error;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.accent }}>
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT CARD  (top section)
// ─────────────────────────────────────────────────────────────────────────────
interface ReportCardProps {
  type:       ReportType;
  title:      string;
  description:string;
  icon:       React.ReactNode;
  accentColor:string;
  selected:   boolean;
  onPreview:    () => void;
  onExport:     (format: "pdf" | "excel" | "csv") => void;
  loading:      boolean;
  exportLoading: string | null;

}





function ReportCard({
  type, title, description, icon, accentColor,
  selected, onPreview, loading, exportLoading, onExport,
}: ReportCardProps) {

  const PERIOD_OPTIONS = {
   mensuel: [
    { label: "Mois en cours", value: "current_month" },
    { label: "Mois précédent", value: "last_month" },
  ],

  trimestriel: [
    { label: "Trimestre en cours", value: "current_quarter" },
    { label: "Trimestre précédent", value: "last_quarter" },
  ],

  annuel: [
    { label: "Année en cours", value: "current_year" },
    { label: "Année précédente", value: "last_year" },
  ],
};

  const [periods, setPeriods] = useState<Record<ReportType, string>>({
  mensuel: "current_month",
  trimestriel: "current_quarter",
  annuel: "current_year",
});
  

  return (
    
    <div
      className="relative rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5"
      style={selected ? glassSelected : glass}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: selected ? C.primary : accentColor }}
      />

      {/* Selected indicator */}
      {selected && (
        <div
          className="absolute top-3 right-3 w-2 h-2 rounded-full"
          style={{ background: C.primary }}
        />
      )}

      {/* Icon + title */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: selected ? `${C.primary}18` : `${accentColor}18` }}
        >
          {icon}
        </div>
        <div>
          <h3
            className="font-bold text-sm"
            style={{ color: C.dark, fontFamily: "'Sora', sans-serif" }}
          >
            {title}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: C.dark, opacity: 0.5 }}>
            {description}
          </p>
        </div>
      </div>

      {/* Period selector */}
      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: C.dark, opacity: 0.5 }}>
          Sélectionner la période
        </label>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border relative"
          style={{ background: C.input, borderColor: C.accent }}
        >
          <Calendar size={13} style={{ color: C.dark, opacity: 0.4, flexShrink: 0 }} />
          <select
  value={periods[type]}
  onChange={(e) =>
    setPeriods((prev) => ({
      ...prev,
      [type]: e.target.value,
    }))
  }
  className="text-xs bg-transparent outline-none w-full cursor-pointer"
  style={{ color: C.dark }}
>
  {PERIOD_OPTIONS[type].map((p) => (
    <option key={p.value} value={p.value}>
      {p.label}
    </option>
  ))}
</select>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 mt-auto">
        {/* Preview — primary */}
        <button
          onClick={onPreview}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: selected ? C.primary : C.dark }}
        >
          {loading && selected ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Chargement…
            </>
          ) : (
            <>
              <Eye size={14} />
              Aperçu du rapport
            </>
          )}
        </button>

        {/* Export buttons */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "PDF",   format: "pdf"   as const, Icon: FileDown,  color: "#DC2626" },
            { label: "Excel", format: "excel" as const, Icon: TableIcon, color: "#1a7149" },
            { label: "CSV",   format: "csv"   as const, Icon: Download,  color: "#3b82f6" },
          ].map(({ label, format, Icon, color }) => (
            <button
              key={label}
              onClick={() => onExport(format)}
              className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium border transition-all hover:shadow-sm"
              style={{ background: C.input, borderColor: C.accent, color: C.dark }}
            >
              {exportLoading === format
              ? <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <Icon size={12} style={{ color }} />
              }
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD  (inside preview)
// ─────────────────────────────────────────────────────────────────────────────
function PreviewKPI({
  label, value, pct, accentColor, isCurrency = true,
}: {
  label: string; value: number; pct: number;
  accentColor: string; isCurrency?: boolean;
}) {
  return (
    <div
      className="relative rounded-2xl p-5 flex flex-col gap-3"
      style={glass}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: accentColor }} />
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: C.dark, opacity: 0.5 }}>
          {label}
        </p>
        <PctBadge value={pct} />
      </div>
      <p className="text-2xl font-bold" style={{ color: C.dark, fontFamily: "'Sora', sans-serif" }}>
        {isCurrency ? fmt(value) : `${value}%`}
      </p>
      <p className="text-xs" style={{ color: C.dark, opacity: 0.4, borderTop: `1px solid ${C.accent}`, paddingTop: 8 }}>
        vs période précédente
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW SECTION
// ─────────────────────────────────────────────────────────────────────────────
interface PreviewProps {
  type:   ReportType;
  period: string;
  data:   ReportData;
  showPreview: boolean;
  setShowPreview: (v: boolean) => void;
  onExport: (format: "pdf" | "excel" | "csv") => void;
  exportLoading: string | null;  
}



function PreviewSection({ type, period, data, showPreview, setShowPreview, onExport, exportLoading }: PreviewProps) {
  const today = new Date().toLocaleDateString("fr-TN", {
    day: "2-digit", month: "long", year: "numeric",
  });



  return (
    <div className="space-y-5">

      {/* ── A. Report header ─────────────────────────────── */}
      <div
        className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={glass}
      >
        {/* Left: logo + meta */}
        <div className="flex items-center gap-4">
          {/* Logo placeholder */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: C.primary }}
          >
            <Building2 size={22} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: C.dark, fontFamily: "'Sora', sans-serif" }}>
              Plateforme BI
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: `${C.primary}18`, color: C.primary }}
              >
                {TYPE_LABELS[type]}
              </span>
              <span
                className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                style={{ background: C.input, color: C.dark }}
              >
                📅 {period}
              </span>
            </div>
          </div>
        </div>

        {/* Right: date + print */}
        <div className="flex items-center justify-between mb-4">
  
  {/* Date */}
  <p className="text-xs text-gray-400">
    Date de génération : {today}
  </p>

  {/* Button */}
  <button
    onClick={() => setShowPreview(false)}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white hover:bg-gray-50 transition"
  >
    <Printer size={12} />
    {showPreview ? "Masquer l’aperçu" : "Afficher l’aperçu"}
  </button>

</div>


        
      </div>

      {/* ── B. KPI Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <PreviewKPI label="Chiffre d'Affaires" value={data.ca} pct={data.caPct}   accentColor={C.primary} />
        <PreviewKPI label="Coût Total"  value={data.cout} pct={data.coutPct}  accentColor={C.error}   />
        <PreviewKPI label="Marge Nette"  value={data.marge} pct={data.margePct} accentColor={C.primary} />
        <PreviewKPI label="Taux de Recouvrement" value={data.recouvrement} pct={data.recouvrementPct} accentColor="#3b82f6" isCurrency={false} />
      </div>

      {/* ── C. Top 5 sessions ────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={glass}>
        {/* Table header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: C.accent }}
        >
          <div>
            <p className="font-bold text-sm" style={{ color: C.dark, fontFamily: "'Sora', sans-serif" }}>
              Top 5 Sessions de la période
            </p>
            <p className="text-xs mt-0.5" style={{ color: C.dark, opacity: 0.4 }}>
              Synthèse des 5 sessions les plus significatives
            </p>
          </div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `${C.primary}12`, color: C.primary }}
          >
            Aperçu uniquement
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(229,234,221,0.4)" }}>
                {[
                  "Formation / Session",
                  "Inscrits",
                  "Chiffre d'Affaires",
                  "Coût",
                  "Marge",
                  "Remplissage",
                  "Statut",
                ].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: C.dark, opacity: 0.5 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((row, i) => (
                <tr
                  key={i}
                  className="border-t hover:bg-white/50 transition-colors"
                  style={{ borderColor: C.accent }}
                >
                  {/* Formation / Session */}
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold" style={{ color: C.dark }}>
                      {row.session}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: C.dark, opacity: 0.45 }}>
                      {row.formation}
                    </p>
                  </td>

                  {/* Inscrits */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold" style={{ color: C.dark }}>
                      {row.inscrits}
                    </span>
                    <span className="text-xs" style={{ color: C.dark, opacity: 0.4 }}>
                      /{row.capacite}
                    </span>
                  </td>

                  {/* CA */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold" style={{ color: C.dark }}>
                      {fmt(row.ca)}
                    </span>
                  </td>

                  {/* Coût */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold" style={{ color: C.error }}>
                      {fmt(row.cout)}
                    </span>
                  </td>

                  {/* Marge */}
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-bold"
                      style={{ color: row.marge > 0 ? C.primary : row.marge === 0 ? C.warning : C.error }}
                    >
                      {row.marge >= 0 ? "+" : ""}{fmt(row.marge)}
                    </span>
                  </td>

                  {/* Remplissage */}
                  <td className="px-4 py-3 min-w-[120px]">
                    <MiniBar value={row.inscrits} max={row.capacite} />
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-3">
                    <StatutBadge statut={row.statut} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div
          className="px-5 py-3 border-t"
          style={{ borderColor: C.accent, background: "rgba(229,234,221,0.2)" }}
        >
          <p className="text-xs" style={{ color: C.dark, opacity: 0.4 }}>
            ℹ️ Cet aperçu affiche uniquement les 5 premières sessions. Exportez le rapport complet pour voir toutes les données.
          </p>
        </div>
      </div>

      {/* ── Export actions (repeated at the bottom) ──────── */}
      <div
        className="rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4"
        style={glass}
      >
        <div>
          <p className="font-semibold text-sm" style={{ color: C.dark, fontFamily: "'Sora', sans-serif" }}>
            Exporter ce rapport
          </p>
          <p className="text-xs mt-0.5" style={{ color: C.dark, opacity: 0.45 }}>
            {TYPE_LABELS[type]} · {period}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "Exporter PDF",   format: "pdf"   as const, Icon: FileDown,  bg: C.error,   text: "#fff" },
            { label: "Exporter Excel", format: "excel" as const, Icon: TableIcon, bg: C.primary, text: "#fff" },
            { label: "Exporter CSV",   format: "csv"   as const, Icon: Download,  bg: "#3b82f6", text: "#fff" },
          ].map(({ label, format, Icon, bg, text }) => (
            <button
              key={label}
              onClick={() => onExport(format)}
              disabled={exportLoading === format}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-0 transition-all hover:opacity-90"
              style={{ background: bg, color: text }}
            >
               {exportLoading === format
               ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
               : <Icon size={14} />
               }
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const REPORT_CARDS: {
  type:        ReportType;
  title:       string;
  description: string;
  icon:        React.ReactNode;
  accentColor: string;
}[] = [
  {
    type:        "mensuel",
    title:       "Rapport Mensuel",
    description: "Synthèse financière mois par mois",
    icon:        <Calendar  size={20} color={C.primary} />,
    accentColor: C.primary,
  },
  {
    type:        "trimestriel",
    title:       "Rapport Trimestriel",
    description: "Analyse comparative par trimestre",
    icon:        <BarChart2 size={20} color="#3b82f6" />,
    accentColor: "#3b82f6",
  },
  {
    type:        "annuel",
    title:       "Rapport Annuel",
    description: "Bilan complet de l'exercice fiscal",
    icon:        <FileText  size={20} color={C.warning} />,
    accentColor: C.warning,
  },
];

export default function ReportingPage() {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [showPreview,  setShowPreview]  = useState(false);
  const [previewData,  setPreviewData]  = useState<ReportData | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  // ── Handlers ─────────────────────────────────────────────
  async function handlePreview(type: ReportType) {
    setSelectedType(type);
    setLoading(true);
    setShowPreview(false);
    setError(null);

    try {
      const res = await fetchReportPreview({ period: TYPE_TO_PERIOD[type] });
      setPreviewData(mapResponse(res));
      setShowPreview(true);
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e: any) {
      setError(e.message ?? "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: "pdf" | "excel" | "csv") {
    if (!selectedType) return;
    setExportLoading(format);
    try {
      await exportReport({ period: TYPE_TO_PERIOD[selectedType] }, format);
    } catch (e: any) {
      setError(e.message ?? "Erreur export");
    } finally {
      setExportLoading(null);
    }
  }

  const previewPeriod = selectedType
    ? TYPE_LABELS[selectedType]
    : "";

  return (
    <DashboardLayout>
        <div
      className="p-6 space-y-8 max-w-screen-xl mx-auto"
      style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh" }}
    >

      {/* ── Page header ────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: C.dark, fontFamily: "'Sora', sans-serif" }}
          >
            Rapports Financiers
          </h1>
          <p className="text-xs mt-1" style={{ color: C.dark, opacity: 0.45 }}>
            Générez et exportez vos rapports officiels · Exercice 2025
          </p>
        </div>

        {/* Status pill */}
        {showPreview && selectedType && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: `${C.primary}12`, color: C.primary }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.primary }} />
            Aperçu actif · {TYPE_LABELS[selectedType]}
          </div>
        )}
      </div>

      {/* ── Error banner ── */}
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm font-medium"
            style={{ background: "rgba(220,38,38,0.08)", color: C.error, border: `1px solid ${C.error}30` }}>
            ⚠️ {error}
          </div>
        )}

      {/* ── Report type cards ───────────────────────────────── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.dark, opacity: 0.4 }}>
          Choisir un type de rapport
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REPORT_CARDS.map(card => (
            <ReportCard
              key={card.type}
              {...card}
              selected={selectedType === card.type}
               onExport={handleExport}
              onPreview={() => handlePreview(card.type)}
              loading={loading && selectedType === card.type}
                exportLoading={exportLoading}
            />
          ))}
        </div>
      </section>

      {/* ── Preview section ─────────────────────────────────── */}
      <div ref={previewRef}>
        {/* Loading skeleton */}
        {loading && (
          <section className="space-y-5 animate-pulse">
            <div className="h-24 rounded-2xl" style={{ background: "rgba(229,234,221,0.5)" }} />
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-28 rounded-2xl" style={{ background: "rgba(229,234,221,0.5)" }} />
              ))}
            </div>
            <div className="h-64 rounded-2xl" style={{ background: "rgba(229,234,221,0.5)" }} />
          </section>
        )}

        {/* Actual preview */}
        {!loading && showPreview && previewData && selectedType && (
          <section className="space-y-2">
            {/* Section label */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1" style={{ background: C.accent }} />
              <p className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2"
                style={{ color: C.dark, opacity: 0.4 }}>
                <Eye size={12} />
                Aperçu du rapport
              </p>
              <div className="h-px flex-1" style={{ background: C.accent }} />
            </div>

            <PreviewSection
              type={selectedType}
              period={previewPeriod}
              data={previewData}
              showPreview={showPreview}
              setShowPreview={setShowPreview}
              onExport={handleExport}
              exportLoading={exportLoading}
            />
          </section>
        )}

        {/* Empty state — no report selected yet */}
        {!loading && !showPreview && (
          <div
            className="rounded-2xl p-12 flex flex-col items-center justify-center text-center"
            style={glass}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `${C.primary}12` }}
            >
              <FileText size={24} style={{ color: C.primary, opacity: 0.6 }} />
            </div>
            <p className="font-semibold text-sm mb-1" style={{ color: C.dark, fontFamily: "'Sora', sans-serif" }}>
              Aucun rapport sélectionné
            </p>
            <p className="text-xs max-w-xs" style={{ color: C.dark, opacity: 0.4 }}>
              Choisissez un type de rapport ci-dessus, sélectionnez la période souhaitée puis cliquez sur "Aperçu du rapport".
            </p>
          </div>
        )}
      </div>

    </div>
    </DashboardLayout>
    
  );
}
