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
// Le back retourne : { paymentId, apprenant, formation, montant, date, status }
// montant = montant_encaisse uniquement (pas de montantTotal séparé dans cette route)
function mapPaymentRow(raw: any, index: number): Paiement {

  const formationKey = (raw.formationTitle || raw.formation || 'noform').replace(/\s+/g, '');
  const uniqueId = `reg-${raw.inscriptionId || index}-${formationKey}-${index}`;
  console.log("RAW:", raw);
  const nom = raw.apprenant ?? "";
  const initiales = nom
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";

    

  return {
    id: uniqueId,
    apprenantId: String(raw.apprenantId ?? raw.id ),
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

// ── Modal Add/Edit ─────────────────────────────────────────
function PaiementModal({
  
  open,
  onClose,
  onSave,
  editItem,
  apprenants,
  formations,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (p: Omit<Paiement, "id">) => void;
  editItem?: Paiement | null;
  apprenants: { id: number; nom: string; initiales: string }[];
  formations: { id: number; title: string }[];
}) {
  const [form, setForm] = useState({
    apprenantId: "",
    sessionId: "",
    montantTotal: "",
    montantEncaisse: "",
    date: "",
    statut: "Payé" as PaymentStatus,
  });

  const [searchApprenant, setSearchApprenant] = useState("");
  const [showList, setShowList] = useState(false);0

  const [sessions, setSessions] = useState<{ id: number; title: string }[]>([]);

//hedhi bechh ki yabda yekteb fi nom de l'apprenant , ken yabda el apprenant amel barcha inscriptions , ywalli yatla3lou une seule fois
  const uniqueApprenants = useMemo(() => {
  const seen = new Set();

  return apprenants.filter((a) => {
    const key = `${a.id}-${a.nom}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}, [apprenants]);

  const filteredApprenants = useMemo(() => {
  const q = searchApprenant.toLowerCase().trim();

  if (!q) return uniqueApprenants;

  return uniqueApprenants.filter((a) =>
    a.nom.toLowerCase().includes(q)
  );
}, [searchApprenant, uniqueApprenants]);


//hedhi bech ki yabda yamel recherche lel apprenant ki bech yzid payement , awel mayabda yekteb fl hrouf , ken mafamech toul y9ollou aucun apprenant trouvé

  useEffect(() => {
    if (editItem) {
      setForm({
        apprenantId: editItem.apprenantId,
        sessionId: editItem.sessionId,
        montantTotal: String(editItem.montantTotal),
        montantEncaisse: String(editItem.montantEncaisse),
        date: editItem.date,
        statut: editItem.statut,
      });
      setSearchApprenant(editItem.apprenantNom);
    } else {
      setForm({
        apprenantId: "",
        sessionId: "",
        montantTotal: "",
        montantEncaisse: "",
        date: "",
        statut: "Payé",
      });
    }
  }, [editItem, open]);

  if (!open) return null;
  console.log("APPS RAW:", apprenants);

  const appr = apprenants.find((a) => String(a.id) === form.apprenantId);
  const form_ = formations.find((f) => String(f.id) === form.sessionId);

  function handleSave() {
    if (!form.apprenantId || !form.sessionId || !form.montantEncaisse || !form.date)
      return;
    const selectedSession = sessions.find(
    (s) => String(s.id) === form.sessionId
  );

    onSave({
      apprenantId: form.apprenantId,
      apprenantNom: appr?.nom || "",
      apprenantInitiales: appr?.initiales || "??",
      session: selectedSession?.title || "",
      sessionId: form.sessionId,
       formation: "",        // elformation w formation ID hatithom khater mawjoudin fi type paiement , w ken nahihom famma des fonction bech
       formationId: "",
      montantTotal: Number(form.montantTotal || form.montantEncaisse),
      montantEncaisse: Number(form.montantEncaisse),
      date: form.date,
      statut: form.statut,
    });
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid #e5eadd",
    background: "#efefea",
    color: "#2d4a3e",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#2d4a3e",
    opacity: 0.6,
    marginBottom: 5,
    display: "block",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(45,74,62,0.3)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl"
        style={{ background: "#f9f8f3", border: "1px solid #e5eadd" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            className="font-bold text-base"
            style={{ color: "#2d4a3e", fontFamily: "'Sora', sans-serif" }}
          >
            {editItem ? "Modifier le paiement" : "Enregistrer un Règlement"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-colors"
            style={{ color: "#2d4a3e" }}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label style={labelStyle}>Apprenant</label>
            <div style={{ position: "relative" }}>
  <input
    type="text"
    value={searchApprenant}
    onChange={(e) => {
      setSearchApprenant(e.target.value);
      setShowList(true);
    }}
    onFocus={() => setShowList(true)}
    onBlur={() => setTimeout(() => setShowList(false), 200)}
    placeholder="Rechercher apprenant..."
    style={inputStyle}
  />
  {/* 👇 هذا هو المكان الصحيح */}
{showList && searchApprenant && (
  <div
    className="absolute z-50 w-full mt-2 rounded-2xl overflow-hidden"
    style={{
      background: "#f9f8f3",
      border: "1px solid #e5eadd",
      boxShadow: "0 10px 30px rgba(45,74,62,0.1)",
    }}
  >
    {filteredApprenants.length > 0 ? (
      filteredApprenants.map((a) => (
        <div
          key={a.id}
          onClick={async () => {
  const id = Number(a.id) ;

  setForm((f) => ({
    ...f,
    apprenantId: String(id),
    sessionId: "",
  }));

  setSearchApprenant(a.nom);
  setShowList(false);

   
  const data = await revenueApi.getSessionsByApprenant(id);

  console.log("RAW SESSIONS:", data);

  setSessions(data);
}}
          className="px-4 py-2 cursor-pointer transition-all hover:bg-white"
          style={{ color: "#2d4a3e" }}
        >
          {a.nom}
        </div>
      ))
    ) : (
      <div
        className="px-4 py-3 text-sm"
        style={{ color: "#2d4a3e", opacity: 0.6 }}
      >
        Aucun apprenant trouvé
      </div>
    )}
  </div>
)}
</div>
          </div>
          <div>
            <label style={labelStyle}>Session</label>
            <select
              value={form.sessionId}
              onChange={(e) =>
                setForm((f) => ({ ...f, sessionId: e.target.value }))
              }
              style={{ ...inputStyle, appearance: "none" }}
            >
              <option value="">Sélectionner...</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Montant total (TND)</label>
              <input
                type="number"
                value={form.montantTotal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, montantTotal: e.target.value }))
                }
                style={inputStyle}
                placeholder="1500"
              />
            </div>
            <div>
              <label style={labelStyle}>Montant encaissé (TND)</label>
              <input
                type="number"
                value={form.montantEncaisse}
                onChange={(e) =>
                  setForm((f) => ({ ...f, montantEncaisse: e.target.value }))
                }
                style={inputStyle}
                placeholder="750"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Statut</label>
              <select
                value={form.statut}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    statut: e.target.value as PaymentStatus,
                  }))
                }
                style={{ ...inputStyle, appearance: "none" }}
              >
                <option value="Payé">Payé</option>
                <option value="Partiel">Partiel</option>
                <option value="Impayé">Impayé</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-white"
            style={{ borderColor: "#e5eadd", color: "#2d4a3e" }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: "#1a7149" }}
          >
            {editItem ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
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
         
        // Référentiels + données en parallèle
        const [appr, form, k, p, t] = await Promise.all([
          revenueApi.getApprenants().catch(() => []),
          revenueApi.getFormationsList().catch(() => []),
          revenueApi.getPaymentKpis(apiFilters),
          revenueApi.getPaymentPie(apiFilters),
          
          revenueApi.getPaymentTable(apiFilters), // large page pour le tableau local
          
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
  async function handleSave(p: Omit<Paiement, "id">) {
    try {
      const dto = {
        userId: Number(p.apprenantId),
        formationId: Number(p.formationId),
        montant: p.montantEncaisse,
        paymentDate: p.date,
      };

      if (editItem) {
        await revenueApi.updatePayment(Number(editItem.id), dto);
      } else {
        await revenueApi.addPayment(dto);
      }

      await reload();
      setModalOpen(false);
      setEditItem(null);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'enregistrement du paiement.");
    }
  }

  // ── Suppression ────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce paiement ?")) return;
    try {
      await revenueApi.deletePayment(Number(id));
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression.");
    }
  }


  // ── Recherche de l'apprenant dans la partie add payement ─────────────────

  const apprenantsFromTable = useMemo(() => {
  const map = new Map();

  rows.forEach((r) => {
    if (!map.has(r.apprenantId)) {
      map.set(r.apprenantId, {
        id: r.apprenantId,
        nom: r.apprenantNom,
        initiales: r.apprenantInitiales,
      });
    }
  });

  return Array.from(map.values());
}, [rows]);



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

  const rows = data.map((r) => [
    r.apprenantNom,
    r.session,
    r.montantTotal,
    r.montantEncaisse,
    r.montantTotal - r.montantEncaisse,
    r.statut,
  ]);

  const csv =
    [headers, ...rows]
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
              label: f.title.split(" ")[0],
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
                    colSpan={8}
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

        {/* Pagination */}
        {pages > 1 && (
          <div
            className="flex items-center justify-between px-5 py-3 border-t"
            style={{ borderColor: "#e5eadd" }}
          >
            <span
              className="text-xs"
              style={{ color: "#2d4a3e", opacity: 0.4 }}
            >
              Page {page}/{pages} · {filtered.length} résultats
            </span>
            <div className="flex gap-1">
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className="w-7 h-7 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background:
                      page === i + 1 ? "#1a7149" : "transparent",
                    color: page === i + 1 ? "#fff" : "#2d4a3e",
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
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
        apprenants={apprenantsFromTable}
        formations={formations}
      />
    </div>
  );
}
