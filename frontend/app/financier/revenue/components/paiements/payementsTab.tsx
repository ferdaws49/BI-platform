"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Chart,
  ArcElement,
  DoughnutController,
  Tooltip,
  Legend,
  BarElement,
  BarController,
  CategoryScale,
  LinearScale,
} from "chart.js";
import {
  glassCard,
  fmtCurrency,
  KPICard,
  SectionTitle,
  SearchBox,
  ExportBtn,
  FilterSelect,
  StatusPill,
  Avatar,
  ProgressBar,
} from "../ui";
import { revenueApi } from "@/lib/financier-revenue.api";
import { Paiement, PaymentStatus } from "../../types";

Chart.register(
  ArcElement,
  DoughnutController,
  BarElement,
  BarController,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

const TOOLTIP_BASE = {
  backgroundColor: "#2d4a3e",
  titleColor: "#fff",
  bodyColor: "rgba(255,255,255,0.7)",
  padding: 10,
  cornerRadius: 10,
};

// ── Mapper statut back → front ─────────────────────────────
function mapStatus(s: string): PaymentStatus {
  const normalized = (s ?? "").toLowerCase();
  if (normalized === "paid") return "Payé";
  if (normalized === "partial" ) return "Partiel";
  return "Impayé";
}

// ── Mapper ligne backend → Paiement ───────────────────────
function mapPaymentRow(raw: any, index: number): Paiement {
    console.log("RAW from backend:", raw); // ← AJOUTE ÇA
  const nom = raw.apprenant ?? "";
  const initiales = nom
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";

  return {
    id: Number(raw.paymentId ?? raw.financeId ?? raw.id ?? index),
    apprenantId: String(raw.apprenantId ?? raw.userId ?? ""),
    apprenantNom: nom,
    apprenantInitiales: initiales,
    formation: raw.formation ?? "",
    session: raw.session ?? "",
    sessionId: String(raw.sessionId ?? ""),
    formationId: String(raw.formationId ?? ""),
    montantTotal: Number(raw.total ?? 0),
    montantEncaisse: Number(raw.paid ?? 0),
    date: raw.date ?? "",
    statut: mapStatus(raw.status ?? ""),
  };
}

// ── Grouped bar : Facturé vs Encaissé ─────────────────────
function RecouvrementBarChart({ rows }: { rows: Paiement[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const data = useMemo(() => {
    const map = new Map<string, { facture: number; encaisse: number }>();
    rows.forEach((r) => {
      const key = r.formation || "Autre";
      const cur = map.get(key) || { facture: 0, encaisse: 0 };
      cur.encaisse += r.montantEncaisse;
      cur.facture += r.montantTotal;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([label, v]) => ({ label: label, ...v }))
      .filter((d) => d.facture > 0)
      .slice(0, 6);
  }, [rows]);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: "Revenu Facturé",
            data: data.map((d) => d.facture),
            backgroundColor: "rgba(45,74,62,0.78)",
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: "Argent Encaissé",
            data: data.map((d) => d.encaisse),
            backgroundColor: "rgba(26,113,73,0.88)",
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              color: "rgba(45,74,62,0.65)",
              font: { size: 11, family: "'DM Sans'" },
              usePointStyle: true,
              pointStyleWidth: 10,
            },
          },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: (ctx: any) =>
                ` ${ctx.dataset.label} : ${fmtCurrency(ctx.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "rgba(45,74,62,0.5)",
              font: { size: 11, family: "'DM Sans'" },
            },
            border: { display: false },
          },
          y: {
            grid: { color: "rgba(229,234,221,0.8)" },
            ticks: {
              color: "rgba(45,74,62,0.5)",
              font: { size: 10, family: "'DM Sans'" },
              callback: (v: any) => `${Number(v) / 1000}k`,
            },
            border: { display: false },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data]);

  if (!data.length)
    return (
      <p
        className="text-xs text-center py-8"
        style={{ color: "#2d4a3e", opacity: 0.4 }}
      >
        Aucune donnée à afficher
      </p>
    );

  return (
    <div style={{ height: 230 }}>
      <canvas ref={ref} />
    </div>
  );
}

// ── Pie chart statuts ──────────────────────────────────────
function PaymentPie({
  paye,
  partiel,
  impaye,
}: {
  paye: number;
  partiel: number;
  impaye: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "doughnut",
      data: {
        labels: ["Payé", "Partiel", "Impayé"],
        datasets: [
          {
            data: [paye, partiel, impaye],
            backgroundColor: ["#1a7149CC", "#D97706CC", "#DC2626CC"],
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#2d4a3e",
            titleColor: "#fff",
            bodyColor: "rgba(255,255,255,0.7)",
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
            },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [paye, partiel, impaye]);

  return (
    <div>
      <div style={{ height: 180 }}>
        <canvas ref={ref} />
      </div>
      <div className="flex flex-col gap-2 mt-3">
        {[
          { l: "Payé", c: "#1a7149", v: paye },
          { l: "Partiel", c: "#D97706", v: partiel },
          { l: "Impayé", c: "#DC2626", v: impaye },
        ].map((x) => (
          <div key={x.l} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: x.c }}
              />
              <span style={{ color: "#2d4a3e" }}>{x.l}</span>
            </div>
            <span className="font-semibold" style={{ color: x.c }}>
              {x.v}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Toast de succès ────────────────────────────────────────
function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-[60] flex items-center gap-3 rounded-xl px-5 py-3 shadow-lg border"
      style={{ background: "rgba(26,113,73,0.95)", borderColor: "rgba(255,255,255,0.2)" }}>
      <span className="text-lg">✅</span>
      <span className="text-sm font-medium text-white">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/70 hover:text-white text-xs">✕</button>
    </div>
  );
}

// ── Types locaux ────────────────────────────────────────────
interface ApprenantOption {
  id: number;
  nom: string;
  initiales: string;
}

interface SessionOption {
  id: number | string;
  title: string;
  formationId: number;
}

interface PaymentFormData {
  apprenantId: number | null;
  sessionId: string | number | null;
  formationId: number | null;
  montant: string;
  paymentDate: string;
}

// ── Modal Add/Edit ─────────────────────────────────────────
interface PaiementModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (dto: {
    id?: number;
    apprenantId: number;
    formationId: number;
    montant: number;
    paymentDate: string;
    sessionId?: string | number;
  }) => void | Promise<void>;
  editItem: Paiement | null;
  apprenants: ApprenantOption[];
  formations: { id: number; title: string }[];
}

export function PaiementModal({
  open,
  onClose,
  onSave,
  editItem,
  apprenants,
}: PaiementModalProps) {
  const isEditing = Boolean(editItem);

  const [form, setForm] = useState<PaymentFormData>({
    apprenantId: null,
    sessionId: null,
    formationId: null,
    montant: "",
    paymentDate: new Date().toISOString().split("T")[0],
  });

  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [searchNom, setSearchNom] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Reset / Pré-remplissage ──
  useEffect(() => {
    if (!open) return;

    if (editItem) {
      setForm({
        apprenantId: Number(editItem.apprenantId) || null,
        sessionId: editItem.sessionId || null,
        formationId: Number(editItem.formationId) || null,
        montant: String(editItem.montantEncaisse ?? ""),
        paymentDate: editItem.date || new Date().toISOString().split("T")[0],
      });

      const app = apprenants.find(
        (a) => String(a.id) === String(editItem.apprenantId)
      );
      setSearchNom(app?.nom ?? "");

      const uid = Number(editItem.apprenantId);
      if (uid) loadSessions(uid);
    } else {
      setForm({
        apprenantId: null,
        sessionId: null,
        formationId: null,
        montant: "",
        paymentDate: new Date().toISOString().split("T")[0],
      });
      setSearchNom("");
      setSessions([]);
    }
    setError(null);
  }, [open, editItem, apprenants]);

  // ── Fermer dropdown si clic extérieur ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Charger les sessions d'un apprenant ──
  const loadSessions = async (apprenantId: number) => {
    setLoadingSessions(true);
    try {
      const data = await revenueApi.getSessionsByApprenant(apprenantId);
      setSessions(data);
    } catch (e: any) {
      setError(e.message || "Erreur lors du chargement des sessions");
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  // ── Sélection apprenant (création uniquement) ──
  const selectApprenant = (app: ApprenantOption) => {
    setSearchNom(app.nom);
    setShowDropdown(false);
    setForm((prev) => ({
      ...prev,
      apprenantId: app.id,
      sessionId: null,
      formationId: null,
    }));
    setSessions([]);
    loadSessions(app.id);
  };

  // ── Changement session → récupère formationId auto ──
  const handleSessionChange = (val: string) => {
    const session = sessions.find((s) => String(s.id) === val);
    setForm((prev) => ({
      ...prev,
      sessionId: session?.id ?? null,
      formationId: session?.formationId ?? null,
    }));
  };

  // ── Filtre local apprenants ──
  const filteredApprenants = useMemo(() => {
    if (!searchNom.trim()) return apprenants;
    const q = searchNom.toLowerCase();
    return apprenants.filter(
      (a) =>
        a.nom.toLowerCase().includes(q) ||
        a.initiales.toLowerCase().includes(q)
    );
  }, [searchNom, apprenants]);

  // ── Submit ──
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.apprenantId || !form.sessionId || !form.formationId || !form.montant || !form.paymentDate) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setError(null);
    onSave({
      ...(editItem ? { id: editItem.id } : {}),
      apprenantId: form.apprenantId,
      formationId: form.formationId,
      montant: Number(form.montant),
      paymentDate: form.paymentDate,
      sessionId: form.sessionId,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl p-6 shadow-xl" style={{ background: "#f8faf6", border: "1px solid #e5eadd" }}>
        <h2 className="mb-4 text-xl font-bold" style={{ color: "#2d4a3e", fontFamily: "'Sora', sans-serif" }}>
          {isEditing ? "Modifier le paiement" : "Ajouter un paiement"}
        </h2>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ─── Apprenant (autocomplete) ─── */}
          <div className="relative" ref={dropdownRef}>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#2d4a3e", opacity: 0.7 }}>
              Apprenant <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="text"
              value={searchNom}
              disabled={isEditing}
              onChange={(e) => {
                if (isEditing) return;
                setSearchNom(e.target.value);
                setShowDropdown(true);
                if (!e.target.value) {
                  setForm((p) => ({ ...p, apprenantId: null, sessionId: null, formationId: null }));
                  setSessions([]);
                }
              }}
              onFocus={() => !isEditing && setShowDropdown(true)}
              placeholder="Tapez le nom de l'apprenant..."
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all"
              style={{ borderColor: "#e5eadd", color: "#2d4a3e", background: "#fff" }}
              autoComplete="off"
            />

            {showDropdown && !isEditing && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border shadow-lg" style={{ borderColor: "#e5eadd", background: "#fff" }}>
                {filteredApprenants.length === 0 ? (
                  <div className="p-3 text-sm" style={{ color: "#2d4a3e", opacity: 0.5 }}>
                    Aucun apprenant trouvé
                  </div>
                ) : (
                  filteredApprenants.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => selectApprenant(app)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[rgba(26,113,73,0.06)]"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold" style={{ background: "rgba(26,113,73,0.12)", color: "#1a7149" }}>
                        {app.initiales}
                      </span>
                      <span style={{ color: "#2d4a3e" }}>{app.nom}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ─── Session (cascade) ─── */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#2d4a3e", opacity: 0.7 }}>
              Session <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <select
              value={form.sessionId ?? ""}
              onChange={(e) => handleSessionChange(e.target.value)}
              disabled={!form.apprenantId || loadingSessions || sessions.length === 0}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: "#e5eadd", color: "#2d4a3e", background: "#fff" }}
            >
              <option value="" style={{ color: "#2d4a3e", opacity: 0.4 }}>
                {loadingSessions
                  ? "Chargement des sessions…"
                  : !form.apprenantId
                  ? "Sélectionnez d'abord un apprenant"
                  : sessions.length === 0
                  ? "Aucune session trouvée"
                  : "Choisir une session"}
              </option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* ─── Montant ─── */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#2d4a3e", opacity: 0.7 }}>
              Montant (DT) <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.montant}
              onChange={(e) => setForm((p) => ({ ...p, montant: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: "#e5eadd", color: "#2d4a3e", background: "#fff" }}
              placeholder="0.00"
            />
          </div>

          {/* ─── Date ─── */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#2d4a3e", opacity: 0.7 }}>
              Date de paiement <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="date"
              required
              value={form.paymentDate}
              onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: "#e5eadd", color: "#2d4a3e", background: "#fff" }}
            />
          </div>

          {/* ─── Actions ─── */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-4 py-2 text-sm font-semibold transition-all hover:bg-white"
              style={{ borderColor: "#e5eadd", color: "#2d4a3e" }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "#1a7149" }}
            >
              {isEditing ? "Modifier" : "Valider le paiement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Sortable column header ─────────────────────────────────
type SortKey =
  | "montantTotal"
  | "montantEncaisse"
  | "montantEncours"
  | "statut";
type SortDir = "asc" | "desc";

function SortTh({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => onSort(col)}
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none"
      style={{ color: "#2d4a3e", opacity: active ? 1 : 0.5 }}
    >
      <span className="flex items-center gap-1">
        {label}
        <span style={{ opacity: active ? 1 : 0.3 }}>
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </span>
    </th>
  );
}

// ── Pagination avec flèches ───────────────────────────────
function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}) {
  if (pages <= 1) return null;

  const getRange = () => {
    const delta = 1;
    const range: (number | string)[] = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== "...") {
        range.push("...");
      }
    }
    return range;
  };

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "#e5eadd" }}>
      <span className="text-xs" style={{ color: "#2d4a3e", opacity: 0.4 }}>
        Page {page}/{pages} · {pages} pages
      </span>
      <div className="flex items-center gap-1">
        {/* Précédent */}
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-all disabled:opacity-30"
          style={{
            background: page === 1 ? "transparent" : "rgba(229,234,221,0.5)",
            color: "#2d4a3e",
          }}
        >
          ‹
        </button>

        {/* Numéros */}
        {getRange().map((item, idx) =>
          item === "..." ? (
            <span key={`dots-${idx}`} className="px-1 text-xs" style={{ color: "#2d4a3e", opacity: 0.4 }}>
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onChange(Number(item))}
              className="h-7 min-w-[28px] rounded-lg px-1.5 text-xs font-medium transition-all"
              style={{
                background: page === item ? "#1a7149" : "transparent",
                color: page === item ? "#fff" : "#2d4a3e",
              }}
            >
              {item}
            </button>
          )
        )}

        {/* Suivant */}
        <button
          onClick={() => onChange(Math.min(pages, page + 1))}
          disabled={page === pages}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-all disabled:opacity-30"
          style={{
            background: page === pages ? "transparent" : "rgba(229,234,221,0.5)",
            color: "#2d4a3e",
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ── Onglet principal ───────────────────────────────────────
export default function PaiementsTab({
  filters,
}: {
  filters: Record<string, any>;
}) {
  const [rows, setRows] = useState<Paiement[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [pieData, setPieData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [apprenants, setApprenants] = useState<
    { id: number; nom: string; initiales: string }[]
  >([]);
  const [formations, setFormations] = useState<
    { id: number; title: string }[]
  >([]);

  const [search, setSearch] = useState("");
  const [filterFormation, setFilterFormation] = useState("Tout");
  const [filterStatut, setFilterStatut] = useState("Tout");
  const [filterDette, setFilterDette] = useState("Tout");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Paiement | null>(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const PER = 6;

  // ── Chargement des données ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const statusToSend = filterStatut !== "Tout" 
        ? (filterStatut === "Payé" ? "paid" : filterStatut === "Partiel" ? "partial" : "unpaid")
        : filters.paymentStatus;

        const apiFilters = { ...filters , paymentStatus: statusToSend };
         
        const [appr, form, k, p, t] = await Promise.all([
          revenueApi.getApprenants().catch(() => []),
          revenueApi.getFormationsList().catch(() => []),
          revenueApi.getPaymentKpis(apiFilters),
          revenueApi.getPaymentPie(apiFilters),
          revenueApi.getPaymentTable(apiFilters),
        ]);

        if (cancelled) return;

        setApprenants(appr);
        setFormations(form);
        setKpis(k);
        setPieData(p);
        setRows((t.items ?? []).map(mapPaymentRow));
      } catch (e) {
        console.error("Erreur chargement paiements:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filters, filterStatut]);

  // ── KPIs ──────────────────────────────────────────────
  const totalEncaisse = kpis?.totalEncaisse ?? 0;
  const totalNonEncaisse = kpis?.totalNonEncaisse ?? 0;
  const totalFacture = totalEncaisse + totalNonEncaisse;
  const tauxPaiement =
    kpis?.paymentRatePercent ??
    (totalFacture > 0
      ? Math.round((totalEncaisse / totalFacture) * 100)
      : 0);
  const nbrReglements =
    kpis?.paymentsCount ??
    rows.filter((r) => r.statut === "Payé").length;

  // ── Pie % ──────────────────────────────────────────────
  const slices = pieData?.slices ?? [];
  const payePct = Math.round(
    slices.find((s: any) => s.status === "paye")?.percent ?? 0
  );
  const partielPct = Math.round(
    slices.find((s: any) => s.status === "avance")?.percent ?? 0
  );
  const impayePct = Math.round(
    slices.find((s: any) => s.status === "impaye")?.percent ?? 0
  );

  // ── Filtres locaux ─────────────────────────────────────
  const filtered = useMemo(() => {
    let r = [...rows];
    if (search)
      r = r.filter((x) =>
        x.apprenantNom.toLowerCase().includes(search.toLowerCase())
      );
    if (filterFormation !== "Tout")
      r = r.filter((x) => x.formationId === filterFormation);
    if (filterStatut !== "Tout")
      r = r.filter((x) => x.statut === filterStatut);
    if (filterDette === "500")
      r = r.filter((x) => x.montantTotal - x.montantEncaisse >= 500);
    if (filterDette === "1000")
      r = r.filter((x) => x.montantTotal - x.montantEncaisse >= 1000);
    return r;
  }, [rows, search, filterFormation, filterStatut, filterDette]);

  // ── Tri ────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === "montantEncours") {
        va = a.montantTotal - a.montantEncaisse;
        vb = b.montantTotal - b.montantEncaisse;
      } else {
        va = a[sortKey as keyof Paiement];
        vb = b[sortKey as keyof Paiement];
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const paged = sorted.slice((page - 1) * PER, page * PER);
  const pages = Math.ceil(filtered.length / PER);

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(col);
      setSortDir("desc");
    }
    setPage(1);
  }

  // ── Rechargement après mutation ────────────────────────
  async function reload() {
    try {
      const [k, pi, t] = await Promise.all([
        revenueApi.getPaymentKpis(filters),
        revenueApi.getPaymentPie(filters),
        revenueApi.getPaymentTable({ ...filters, page: 1 , limit: 200 }),
      ]);
      setKpis(k);
      setPieData(pi);
      setRows((t.items ?? []).map(mapPaymentRow));
    } catch (e) {
      console.error("Erreur rechargement:", e);
    }
  }

  // ── Sauvegarde (create / update) ──────────────────────
  async function handleSave(dto: {
    id?: number;
    apprenantId: number;
    formationId: number;
    montant: number;
    paymentDate: string;
    sessionId?: string | number;
  }) {
    try {
      if (dto.id) {
        await revenueApi.updatePayment(dto.id, dto);
        setToast("Paiement modifié avec succès ✅");
      } else {
        await revenueApi.addPayment(dto);
        setToast("Paiement ajouté avec succès ✅");
      }

      await reload();
      setModalOpen(false);
      setEditItem(null);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'enregistrement du paiement.');
    }
  }

  // ── Suppression ────────────────────────────────────────
  async function handleDelete(id: number) {
    if (!confirm("Supprimer ce paiement ?")) return;
    try {
      await revenueApi.deletePayment(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setToast("Paiement supprimé ✅");
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression.");
    }
  }

  // ── export ───────────────────────────────
  function handleExport() {
    const data = sorted;
    if (!data || data.length === 0) return;

    const headers = [
      "Apprenant",
      "Session",
      "Total",
      "Encaissé",
      "Restant",
      "Statut",
    ];

    const csvRows = data.map((r) => [
      r.apprenantNom,
      r.session,
      r.montantTotal,
      r.montantEncaisse,
      r.montantTotal - r.montantEncaisse,
      r.statut,
    ]);

    const csv =
      [headers, ...csvRows]
        .map((e) => e.join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "paiements.csv";
    a.click();
  }

  // ── Skeleton ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl"
              style={{ background: "rgba(229,234,221,0.5)" }}
            />
          ))}
        </div>
        <div
          className="h-64 rounded-2xl"
          style={{ background: "rgba(229,234,221,0.5)" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Toast ── */}
      {toast && <SuccessToast message={toast} onClose={() => setToast(null)} />}

      {/* ── Filtres locaux ── */}
      <div
        className="flex flex-wrap items-center gap-2 p-4 rounded-2xl"
        style={glassCard}
      >
        <FilterSelect
          value={filterFormation}
          onChange={(v) => {
            setFilterFormation(v);
            setPage(1);
          }}
          label="Formation :"
          options={[
            { label: "Toutes", value: "Tout" },
            ...formations.map((f) => ({
              label: f.title,
              value: String(f.id),
            })),
          ]}
        />

        <FilterSelect
          value={filterStatut}
          onChange={(v) => {
            setFilterStatut(v);
            setPage(1);
          }}
          label="Statut :"
          options={["Tout", "Payé", "Partiel", "Impayé"].map((v) => ({
            label: v,
            value: v,
          }))}
        />

        <FilterSelect
          value={filterDette}
          onChange={(v) => {
            setFilterDette(v);
            setPage(1);
          }}
          label="Encours min :"
          options={[
            { label: "Tous", value: "Tout" },
            { label: "> 500 TND", value: "500" },
            { label: "> 1 000 TND", value: "1000" },
          ]}
        />

        <button
          onClick={() => {
            setEditItem(null);
            setModalOpen(true);
          }}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "#1a7149" }}
        >
          <span>+</span> Ajouter paiement
        </button>
      </div>

      {/* ── KPIs + Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <KPICard
            label="Total Encaissé"
            value={fmtCurrency(totalEncaisse)}
            accentColor="#1a7149"
            badge={
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: "rgba(26,113,73,0.12)",
                  color: "#1a7149",
                }}
              >
                {Math.round(tauxPaiement)}%
              </span>
            }
          />
          <KPICard
            label="Total Non Encaissé"
            value={fmtCurrency(totalNonEncaisse)}
            accentColor="#DC2626"
            valueColor="#DC2626"
          />
          <KPICard
            label="Taux de Recouvrement"
            value={`${Math.round(tauxPaiement)}%`}
            accentColor="#3b82f6"
            sub={`${fmtCurrency(totalEncaisse)} / ${fmtCurrency(totalFacture)}`}
          />
          <KPICard
            label="Nombre de Règlements"
            value={String(nbrReglements)}
            accentColor="#2d4a3e"
            sub={`sur ${rows.length} paiements totaux`}
          />
        </div>

        <div className="rounded-2xl p-5" style={glassCard}>
          <SectionTitle
            title="Répartition statuts"
            sub="% par type de paiement"
          />
          <PaymentPie
            paye={payePct}
            partiel={partielPct}
            impaye={impayePct}
          />
        </div>
      </div>

      {/* ── Graphique de recouvrement ── */}
      <div className="rounded-2xl p-5" style={glassCard}>
        <SectionTitle
          title="Graphique de Recouvrement"
          sub="Revenu Facturé vs Argent Encaissé — par formation"
        />
        <RecouvrementBarChart rows={rows} />
      </div>

      {/* ── Tableau ── */}
      <div className="rounded-2xl overflow-hidden" style={glassCard}>
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b"
          style={{ borderColor: "#e5eadd" }}
        >
          <div>
            <p
              className="font-bold text-sm"
              style={{
                color: "#2d4a3e",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              Liste des paiements
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "#2d4a3e", opacity: 0.4 }}
            >
              {sorted.length} résultat{sorted.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SearchBox
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Nom apprenant..."
            />
            <ExportBtn onClick={handleExport} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(229,234,221,0.35)" }}>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#2d4a3e", opacity: 0.5 }}
                >
                  Apprenant
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#2d4a3e", opacity: 0.5 }}
                >
                  Session
                </th>
                <SortTh
                  label="Montant"
                  col="montantTotal"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortTh
                  label="Encaissé"
                  col="montantEncaisse"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortTh
                  label="En cours"
                  col="montantEncours"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortTh
                  label="Statut"
                  col="statut"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#2d4a3e", opacity: 0.5 }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-sm"
                    style={{ color: "#2d4a3e", opacity: 0.35 }}
                  >
                    Aucun paiement trouvé
                  </td>
                </tr>
              ) : (
                paged.map((row, i) => {
                  const encours = row.montantTotal - row.montantEncaisse;
                  const barColor =
                    row.statut === "Payé"
                      ? "#1a7149"
                      : row.statut === "Partiel"
                      ? "#D97706"
                      : "#DC2626";
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-white/50 transition-colors border-t"
                      style={{ borderColor: "#e5eadd" }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar
                            initiales={row.apprenantInitiales}
                            idx={i}
                            size={30}
                          />
                          <p
                            className="text-xs font-semibold"
                            style={{ color: "#2d4a3e" }}
                          >
                            {row.apprenantNom}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-lg"
                          style={{
                            background: "rgba(26,113,73,0.08)",
                            color: "#1a7149",
                          }}
                        >
                          {row.session}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-xs font-semibold"
                        style={{ color: "#2d4a3e" }}
                      >
                        {fmtCurrency(row.montantTotal)}
                      </td>
                      <td className="px-4 py-3">
                        <p
                          className="text-xs font-semibold mb-1"
                          style={{ color: "#1a7149" }}
                        >
                          {fmtCurrency(row.montantEncaisse)}
                        </p>
                        <ProgressBar
                          value={row.montantEncaisse}
                          max={row.montantTotal || 1}
                          color={barColor}
                          height={4}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold ${
                            encours > 0
                              ? "text-red-600"
                              : "text-emerald-700"
                          }`}
                        >
                          {fmtCurrency(encours)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={row.statut} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditItem(row);
                              setModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg text-xs border transition-all hover:bg-white"
                            style={{
                              borderColor: "#e5eadd",
                              color: "#2d4a3e",
                            }}
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="px-2 py-1 rounded-lg text-xs border transition-all hover:bg-white"
                            style={{
                              borderColor: "#e5eadd",
                              color: "#DC2626",
                            }}
                            title="Supprimer"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination avec flèches ── */}
        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>

      {/* ── Modal ── */}
      <PaiementModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        onSave={handleSave}
        editItem={editItem}
        apprenants={apprenants}
        formations={formations}
      />
    </div>
  );
}