"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

import FiltersBar, { type FiltersState } from "./components/filters/FiltersBar";
import KPISection from "./components/kpis/KPISection";
import DetailTable from "./components/table/DetailTable";
import DashboardLayout from "@/components/layout/financier/DashboardLayout";
import { AddCostModal } from "./components/modals/AddCostModal"; // ✅ AJOUT

import { costApi } from "@/lib/financier-cost.api";
import { revenueApi } from "@/lib/financier-revenue.api";


import type {
  KpiCoutsData,
  FormateurCoutPoint,
  RepartitionDepense,
  TrendPoint,
  SessionCoutRow,
  PaginationMeta,
  CostKpiDto,
  TopFormateurCostDto,
  CostTrendPointDto,
  SessionCostTableRowDto,
} from "./types";

const ChartsSection = dynamic(
  () => import("./components/charts/ChartsSection"),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`rounded-xl border border-border bg-muted animate-pulse ${i <= 2 ? "lg:col-span-2" : ""}`}
            style={{ height: 280 }}
          />
        ))}
      </div>
    ),
  }
);

const DEFAULT_FILTERS: FiltersState = {
  periode: "Année",
  dateDebut: "",
  dateFin: "",
  formateurId: "all",
  formationId: "all",
  rentabilite: "all",
  remplissage: "all",
  niveauCout: "all",
  page: 1,
  sortBy: "cout",
  sortOrder: "desc",
};

function mapFilters(f: FiltersState): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  if (f.periode === "Année") mapped.periodPreset = "year";
  if (f.periode === "Trimestre") mapped.periodPreset = "quarter";
  if (f.periode === "Mois") mapped.periodPreset = "month";
  else if (f.periode === "Personnalisé") {
    if (f.dateDebut && f.dateDebut !== "") mapped.startDate = f.dateDebut;
    if (f.dateFin && f.dateFin !== "") mapped.endDate = f.dateFin;
  }

  if (f.formationId !== "all") mapped.formationId = Number(f.formationId);
  if (f.formateurId !== "all") mapped.formateurId = Number(f.formateurId);

  if (f.rentabilite !== "all") mapped.rentabilite = f.rentabilite;
  if (f.remplissage !== "all") mapped.tauxRemplissage = f.remplissage;
  if (f.niveauCout !== "all") mapped.niveauCout = f.niveauCout;

  mapped.page = Number(f.page || 1);
  mapped.limit = Number(10);
  mapped.sortBy = "cout" as any;
  mapped.sortOrder = (f.sortOrder || "desc").toUpperCase();

  return mapped;
}

const CHART_COLORS = [
  "#1a7149", "#D97706", "#2d4a3e", "#3b82f6", "#8b5cf6", "#DC2626",
];

// ✅ AJOUT — Toast de succès (même composant que dans Paiements)
function SuccessToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex items-center gap-3 rounded-xl px-5 py-3 shadow-lg border"
      style={{
        background: "rgba(26,113,73,0.95)",
        borderColor: "rgba(255,255,255,0.2)",
      }}
    >
      <span className="text-lg">✅</span>
      <span className="text-sm font-medium text-white">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-white/70 hover:text-white text-xs"
      >
        ✕
      </button>
    </div>
  );
}

export default function CoutsRentabilitePage() {
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);

  const [kpiData, setKpiData] = useState<KpiCoutsData | null>(null);
  const [topFormateurs, setTopFormateurs] = useState<FormateurCoutPoint[]>([]);
  const [repartition, setRepartition] = useState<RepartitionDepense[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [filteredRows, setFilteredRows] = useState<SessionCoutRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1, limit: 10, total: 0, totalPages: 1,
  });

  const [formationsList, setFormationsList] = useState<{ id: number; title: string }[]>([]);
  const [formateursList, setFormateursList] = useState<{ id: number; nom: string }[]>([]);
  // ✅ AJOUT — sessions pour le dropdown du modal
  const [sessionsList, setSessionsList] = useState<{ id: string; title: string }[]>([]);

  // ✅ AJOUT — état modal & toast
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // ── Chargement initial (dropdowns) ─────────────────────────
  useEffect(() => {
    revenueApi
      .getFormationsList()
      .then((res) => setFormationsList(res || []))
      .catch(console.error);

    costApi
      .getTopFormateurs({ topLimit: 50, periodPreset: "year" })
      .then((res: TopFormateurCostDto[]) => {
        setFormateursList(
          (res || []).map((f) => ({ id: f.formateurId, nom: f.nomFormateur || "—" }))
        );
      })
      .catch(console.error);

    // ✅ AJOUT — charger toutes les sessions pour le modal
    costApi
      .getSessions({ limit: 1000, periodPreset: "year" })
      .then((res: any) => {
        if (res?.items) {
          setSessionsList(
            res.items.map((r: SessionCostTableRowDto) => ({
              id: String(r.sessionId),
              title: r.session || `Session ${r.sessionId}`,
            }))
          );
        }
      })
      .catch(console.error);
  }, []);

  const fetchAllMetrics = useCallback((f: FiltersState) => {
    const mapped = mapFilters(f);

    costApi
      .getKpi(mapped)
      .then((res: CostKpiDto) => {
        if (!res) return;
        const ca =
          (res.breakEven?.avgPricePerStudent ?? 0) *
          (res.breakEven?.totalStudents ?? 0);
        setKpiData({
          coutTotal: res.coutTotal ?? 0,
          coutFormateurs: res.coutFormateurs ?? 0,
          coutMoyenSession: res.coutMoyenParSession ?? 0,
          breakEvenStudents: res.breakEven?.studentsNeeded ?? 0,
          prixMoyenFormation: res.breakEven?.avgPricePerStudent ?? 0,
          chiffreAffaires: ca > 0 ? ca : (res.breakEven?.totalCost ?? 0),
        });
      })
      .catch(console.error);

    costApi
      .getTopFormateurs(mapped)
      .then((res: TopFormateurCostDto[]) => {
        if (!res) return;
        setTopFormateurs(
          res.map((f, i) => ({
            formateur: f.nomFormateur || "—",
            coutTotal: f.coutTotal,
            nbSessions: f.nombreSessions,
            couleur: CHART_COLORS[i % CHART_COLORS.length],
          }))
        );
      })
      .catch(console.error);

    costApi
      .getRepartition(mapped)
      .then((res) => {
        if (!res?.repartition) return;
        setRepartition([
          {
            label: "Coût formateurs",
            value: Math.round(res.repartition.coutFormateursPercent),
            couleur: "#1a7149",
          },
          {
            label: "Coût logistique",
            value: Math.round(res.repartition.coutLogistiquePercent),
            couleur: "#D97706",
          },
        ]);
      })
      .catch(console.error);

    costApi
      .getTrend(mapped)
      .then((res) => {
        if (!res?.points) return;
        setTrend(
          res.points.map((p: CostTrendPointDto) => ({
            mois: p.mois,
            coutTotal: p.coutTotal,
            coutParEtudiant: 0,
          }))
        );
      })
      .catch(console.error);

    costApi
      .getSessions(mapped)
      .then((res) => {
        if (!res?.items) return;
        const ESTIMATED_CAPACITY = 15;
        setFilteredRows(
          res.items.map((r: SessionCostTableRowDto, i: number) => {
            const inscrits = Math.round(
              (r.tauxRemplissagePercent / 100) * ESTIMATED_CAPACITY
            );
            return {
              id: r.sessionId || String(i),
              sessionNom: r.session,
              formation: r.formation,
              formationId: "",
              formateur: r.formateur,
              formateurId: "",
              dateDebut: "",
              inscrits,
              capacite: ESTIMATED_CAPACITY,
              coutDirectFormateur: r.coutDirectFormateur,
              fraisAnnexes: r.fraisLogistique,
              coutTotal: r.coutTotal,
              ca: r.coutTotal + r.marge,
              marge: r.marge,
              statut:
                r.statutRentabilite === "rentable"
                  ? "rentable"
                  : r.statutRentabilite === "seuil"
                  ? "seuil"
                  : "deficitaire",
            } satisfies SessionCoutRow;
          })
        );
        setPagination({
          page: res.page,
          limit: res.limit,
          total: res.total,
          totalPages: res.totalPages,
        });
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchAllMetrics(filters);
  }, [filters, fetchAllMetrics]);

  function handlePageChange(newPage: number) {
    setFilters((prev) => ({ ...prev, page: newPage }));
  }

  // ✅ AJOUT — handler d'enregistrement d'un coût
  async function handleAddCost(dto: {
    type: "depense_formateur" | "depense_logistique";
    sessionId: string;
    montant: number;
    formateurId?: number;
    formateurNom?: string;
    description?: string;
  }) {
    try {
    await costApi.addExpense(dto);
    setToastMsg("Coût ajouté avec succès ✅");
    setCostModalOpen(false);
    fetchAllMetrics(filters); // 🔄 Rafraîchir les données
  } catch (e: any) {
    throw new Error(e.message || "Erreur serveur");
    }
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* ── Page header ── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Analyse des Coûts & Rentabilité
            </h1>
            <p className="text-xs mt-1 text-muted-foreground">
              Vue opérationnelle · Données en temps réel API
            </p>
          </div>
        </div>

        {/* ── Filters ── */}
        <FiltersBar
          filters={filters}
          onChange={(next) => setFilters({ ...next, page: 1 })}
          formations={formationsList}
          formateurs={formateursList}
        />

        {/* ✅ AJOUT — Barre d'action "Ajouter coût" (même style que Paiements) */}
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-border bg-card shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">
            Actions rapides :
          </span>
          <button
            onClick={() => setCostModalOpen(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground transition-all hover:bg-accent"
          >
            <span>+</span> Ajouter coût
          </button>
        </div>

        {/* ── KPIs ── */}
        <section>
          <KPISection data={kpiData} />
        </section>

        {/* ── Charts ── */}
        <section>
          <ChartsSection
            filteredRows={filteredRows}
            formateursCoutData={topFormateurs}
            repartitionData={repartition}
            trendData={trend}
          />
        </section>

        {/* ── Detail table ── */}
        <section>
          <DetailTable
            rows={filteredRows}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </section>

        <footer className="text-center pb-2">
          <p className="text-xs text-muted-foreground/60">
            CentreForm BI · Coûts & Rentabilité
          </p>
        </footer>

        {/* ✅ AJOUT — Toast */}
        {toastMsg && (
          <SuccessToast message={toastMsg} onClose={() => setToastMsg(null)} />
        )}

        {/* ✅ AJOUT — Modal */}
        <AddCostModal
          open={costModalOpen}
          onClose={() => setCostModalOpen(false)}
          onSave={handleAddCost}
          sessions={sessionsList}
          formateurs={formateursList}
        />
      </div>
    </DashboardLayout>
  );
}