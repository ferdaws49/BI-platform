"use client";

import { useState, useRef } from "react";
import {
  FileText, BarChart2, Calendar, Eye,
  FileDown, TableIcon, Download,
  TrendingUp, TrendingDown,
  CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";
import DashboardLayout from "@/components/layout/financier/DashboardLayout";
import {
  fetchReportPreview, exportReport,
  ReportResponse, ReportFilter, ExportFormat,
} from "@/lib/financier-reporting.api";

// ── Design tokens ─────────────────────────────
const C = {
  dark: "#2d4a3e", primary: "#1a7149", error: "#DC2626",
  warning: "#D97706", blue: "#3b82f6", glass: "bg-white/60 backdrop-blur-md border border-[#e5eadd]",
};

// ── Types ─────────────────────────────────────
type ReportType = "mensuel" | "trimestriel" | "annuel";

const TYPE_LABELS: Record<ReportType, string> = {
  mensuel: "Rapport Mensuel",
  trimestriel: "Rapport Trimestriel",
  annuel: "Rapport Annuel",
};

const REPORT_CARDS = [
  { type: "mensuel" as ReportType, title: "Rapport Mensuel", description: "30 derniers jours", icon: <Calendar size={20} color={C.primary} />, accentColor: C.primary },
  { type: "trimestriel" as ReportType, title: "Rapport Trimestriel", description: "3 derniers mois", icon: <BarChart2 size={20} color={C.blue} />, accentColor: C.blue },
  { type: "annuel" as ReportType, title: "Rapport Annuel", description: "Année en cours", icon: <FileText size={20} color={C.warning} />, accentColor: C.warning },
];

// ── Helper : calcule les dates selon le type ──
function getFilterForType(type: ReportType): ReportFilter {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  switch (type) {
    case "mensuel": {
      const start = new Date(today);
      start.setDate(d - 30);
      return { period: "custom", startDate: fmt(start), endDate: fmt(today) };
    }
    case "trimestriel": {
      const start = new Date(y, m - 3, d);
      return { period: "custom", startDate: fmt(start), endDate: fmt(today) };
    }
    case "annuel": {
      const start = new Date(y, 0, 1);
      return { period: "custom", startDate: fmt(start), endDate: fmt(today) };
    }
  }
}

// ── Helpers UI ────────────────────────────────
const fmtMoney = (v: number) => new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    rentable:    { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle2,  label: "Rentable" },
    seuil:       { bg: "bg-amber-100", text: "text-amber-700", icon: AlertTriangle, label: "Seuil atteint" },
    deficitaire: { bg: "bg-red-100",   text: "text-red-700",   icon: XCircle,       label: "Déficitaire" },
  };
  const cfg = map[status];
  if (!cfg) {
    console.warn("StatusBadge: status inconnu →", status);
    return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">{status ?? "—"}</span>;
  }
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────
export default function ReportingPage() {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<ExportFormat | null>(null); 
  const previewRef = useRef<HTMLDivElement>(null);

  async function handlePreview(type: ReportType) {
    setSelectedType(type);
    setLoading(true);
    setError(null);
    setShowPreview(false);

    const filter = getFilterForType(type);
    console.log("[Front] Preview filter:", filter); // debug

    try {
      const data = await fetchReportPreview(filter);
      console.log("[Front] Preview response:", data); // debug
      setReportData(data);
      setShowPreview(true);
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e: any) {
      setError(e.message || "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: ExportFormat) {
    if (!selectedType) return;
    setExportLoading(format);
    setError(null);

    const filter = getFilterForType(selectedType);
    console.log("[Front] Export filter:", filter); // debug

    try {
      await exportReport(filter, format);
    } catch (e: any) {
      setError(e.message || "Erreur export");
    } finally {
      setExportLoading(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 max-w-screen-xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#2d4a3e]">Rapports Financiers</h1>
          <p className="text-sm text-gray-500 mt-1">Générez et exportez vos rapports BI</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REPORT_CARDS.map((card) => (
            <div
              key={card.type}
              onClick={() => handlePreview(card.type)}
              className={`cursor-pointer rounded-2xl p-5 border transition-all hover:-translate-y-1 hover:shadow-lg ${
                selectedType === card.type ? "bg-green-50/50 border-[#1a7149] ring-1 ring-[#1a7149]" : C.glass
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${card.accentColor}18` }}>
                  {card.icon}
                </div>
                <div>
                  <h3 className="font-bold text-[#2d4a3e]">{card.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{card.description}</p>
                </div>
              </div>
              <button className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: card.accentColor }}>
                {loading && selectedType === card.type ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Eye size={14} />}
                {loading && selectedType === card.type ? "Chargement…" : "Aperçu du rapport"}
              </button>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div ref={previewRef}>
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 rounded-2xl bg-gray-200" />
              <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-200" />)}</div>
              <div className="h-64 rounded-2xl bg-gray-200" />
            </div>
          )}

          {!loading && showPreview && reportData && selectedType && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#e5eadd]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Eye size={12} /> Aperçu · {TYPE_LABELS[selectedType]}
                </span>
                <div className="h-px flex-1 bg-[#e5eadd]" />
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Chiffre d'affaires" value={reportData.kpis.revenue} pct={reportData.kpis.performanceVsPreviousPeriod} color={C.primary} />
                <KpiCard label="Coût total" value={reportData.kpis.cost} pct={0} color={C.error} />
                <KpiCard label="Marge nette" value={reportData.kpis.margin} pct={0} color={C.primary} />
                <KpiCard label="Taux recouvrement" value={reportData.kpis.recoveryRate} pct={0} color={C.blue} isPct />
              </div>

              {/* Table */}
              <div className={`rounded-2xl overflow-hidden ${C.glass}`}>
                <div className="px-5 py-4 border-b border-[#e5eadd] flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[#2d4a3e]">Top Sessions</p>
                    <p className="text-xs text-gray-400">Les 5 sessions les plus significatives</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-[#1a7149]">Aperçu uniquement</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#e5eadd]/40">
                        {["Session / Formation","Inscrits","CA","Coût","Marge","Recouv.","Remplissage","Statut"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.sessions.map((row, i) => (
                        <tr key={i} className="border-t border-[#e5eadd] hover:bg-white/50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[#2d4a3e]">{row.sessionName}</p>
                            <p className="text-xs text-gray-400">{row.formationName}</p>
                          </td>
                          <td className="px-4 py-3 text-xs"><span className="font-semibold">{row.inscrits}</span><span className="text-gray-400">/{row.capacite}</span></td>
                          <td className="px-4 py-3 text-xs font-semibold">{fmtMoney(row.revenue)}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-red-600">{fmtMoney(row.cost)}</td>
                          <td className="px-4 py-3 text-xs font-bold" style={{ color: row.margin >= 0 ? C.primary : C.error }}>{row.margin >= 0 ? "+" : ""}{fmtMoney(row.margin)}</td>
                          <td className="px-4 py-3 text-xs">{row.recoveryRate.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-xs">{row.fillRate.toFixed(1)}%</td>
                          <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                        </tr>
                      ))}
                      {reportData.sessions.length === 0 && (
                        <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">Aucune session trouvée pour cette période</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Export */}
              <div className={`rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 ${C.glass}`}>
                <div>
                  <p className="font-semibold text-[#2d4a3e]">Exporter le rapport complet</p>
                  <p className="text-xs text-gray-400">{TYPE_LABELS[selectedType]} · toutes les sessions</p>
                </div>
                <div className="flex gap-2">
                  <ExportBtn format="pdf" label="PDF" bg={C.error} onClick={handleExport} loading={exportLoading} />
                  <ExportBtn format="excel" label="Excel" bg={C.primary} onClick={handleExport} loading={exportLoading} />
                  <ExportBtn format="csv" label="CSV" bg={C.blue} onClick={handleExport} loading={exportLoading} />
                </div>
              </div>
            </div>
          )}

          {!loading && !showPreview && (
            <div className={`rounded-2xl p-12 text-center ${C.glass}`}>
              <FileText size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Sélectionnez un type de rapport pour voir l'aperçu</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ── Sub-components ──────────────────────────────
function KpiCard({ label, value, pct, color, isPct }: { label: string; value: number; pct: number; color: string; isPct?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${C.glass} relative`}>
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: color }} />
      <div className="flex justify-between items-start">
        <p className="text-xs font-medium text-gray-400 uppercase">{label}</p>
        {pct !== 0 && <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${pct >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{pct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{fmtPct(pct)}</span>}
      </div>
      <p className="text-2xl font-bold text-[#2d4a3e] mt-2">{isPct ? `${value.toFixed(1)}%` : fmtMoney(value)}</p>
    </div>
  );
}

function ExportBtn({ format, label, bg, onClick, loading }: { format: ExportFormat; label: string; bg: string; onClick: (f: ExportFormat) => void; loading: ExportFormat | null }) {
  const icons = { pdf: FileDown, excel: TableIcon, csv: Download };
  const Icon = icons[format];
  return (
    <button onClick={() => onClick(format)} disabled={loading === format} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: bg }}>
      {loading === format ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}