"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";


import FiltersBar, { type FiltersState } from "./components/filters/FiltersBar";
import KPISection from "./components/kpis/KPISection";
import DetailTable from "./components/table/DetailTable";
import DashboardLayout from "@/components/layout/financier/DashboardLayout";

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

// Lazy-load charts to avoid SSR issues with Chart.js
const ChartsSection = dynamic(
  () => import("./components/charts/ChartsSection"),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`rounded-2xl ${i <= 2 ? "lg:col-span-2" : ""}`}
            style={{ height: 280, background: "rgba(229,234,221,0.5)" }}
          />
        ))}
      </div>
    ),
  },
);

// ─────────────────────────────────────────────────────────────
// Default filters — "Année" sends periodPreset=year to the backend,
// which covers all sessions for the current year without hardcoded dates.
// ─────────────────────────────────────────────────────────────
const DEFAULT_FILTERS: FiltersState = {
  periode:     "Année",
  dateDebut:   "",
  dateFin:     "",
  formateurId: "all",
  formationId: "all",
  rentabilite: "all",
  remplissage: "all",
  niveauCout:  "all",
  page:        1,
  sortBy:      "cout",
  sortOrder:   "desc",
};
function mapFilters(f: FiltersState): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  // ── period ──
  if (f.periode === "Année") mapped.periodPreset = "year";
  if (f.periode === "Trimestre") mapped.periodPreset = "quarter";
  if (f.periode === "Mois") mapped.periodPreset = "month";
  else if (f.periode === "Personnalisé") {
    if (f.dateDebut && f.dateDebut !== "") mapped.startDate = f.dateDebut;
    if (f.dateFin && f.dateFin !== "") mapped.endDate = f.dateFin;
  }

  // ── IDs ──
  if (f.formationId !== "all") mapped.formationId = Number(f.formationId);
  if (f.formateurId !== "all") mapped.formateurId = Number(f.formateurId);


  if (f.rentabilite !== "all") {
    mapped.rentabilite = f.rentabilite;
  }

  
  if (f.remplissage !== "all") {
    mapped.tauxRemplissage = f.remplissage;
  }

  // ── niveau coût ──
  if (f.niveauCout !== "all") mapped.niveauCout = f.niveauCout;

  // ── pagination ──
  mapped.page = Number(f.page || 1);
  mapped.limit = Number(10);

  // ── SORT FIX (IMPORTANT 🔥) ──
  mapped.sortBy = "cout" as any;
  mapped.sortOrder = (f.sortOrder || "desc").toUpperCase();

  return mapped;
}

// ─────────────────────────────────────────────────────────────
// Colour palette for top-formateurs chart (cycles through 6 colours)
// ─────────────────────────────────────────────────────────────
const CHART_COLORS = [
  "#1a7149",
  "#D97706",
  "#2d4a3e",
  "#3b82f6",
  "#8b5cf6",
  "#DC2626",
];

// ─────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────
export default function CoutsRentabilitePage() {
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);

  // ── UI data state ─────────────────────────────────────────
  const [kpiData,       setKpiData]       = useState<KpiCoutsData | null>(null);
  const [topFormateurs, setTopFormateurs] = useState<FormateurCoutPoint[]>([]);
  const [repartition,   setRepartition]   = useState<RepartitionDepense[]>([]);
  const [trend,         setTrend]         = useState<TrendPoint[]>([]);
  const [filteredRows,  setFilteredRows]  = useState<SessionCoutRow[]>([]);
  const [pagination,    setPagination]    = useState<PaginationMeta>({
    page: 1, limit: 10, total: 0, totalPages: 1,
  });

  // ── Dropdown option lists ─────────────────────────────────
  const [formationsList,  setFormationsList]  = useState<{ id: number; title: string }[]>([]);
  const [formateursList,  setFormateursList]  = useState<{ id: number; nom: string }[]>([]);

  // ── One-time load: populate filter dropdowns ──────────────
  useEffect(() => {
    revenueApi
      .getFormationsList()
      .then((res) => setFormationsList(res || []))
      .catch(console.error);

    // Use a wide fetch (topLimit 50, no period filter) so the dropdown
    // always shows all known formateurs, not just those in the current period.
    costApi
      .getTopFormateurs({ topLimit: 50, periodPreset: "year" })
      .then((res: TopFormateurCostDto[]) => {
        setFormateursList(
          (res || []).map((f) => ({ id: f.formateurId, nom: f.nomFormateur || "—" })),
        );
      })
      .catch(console.error);
  }, []);

  // ── Fetch all metrics whenever filters change ─────────────
  //
  // We map FiltersState → CostFilterDto shape once here, then pass the
  // same mapped object to every API call so all charts/table stay in sync.
  const fetchAllMetrics = useCallback((f: FiltersState) => {
    const mapped = mapFilters(f);
    

    // KPI ───────────────────────────────────────────────────
    costApi
      .getKpi(mapped)
      .then((res: CostKpiDto) => {
        if (!res) return;
        // chiffreAffaires = avgPrice × totalStudents (best approximation
        // available without a dedicated CA endpoint).
        const ca =
          (res.breakEven?.avgPricePerStudent ?? 0) *
          (res.breakEven?.totalStudents ?? 0);

        setKpiData({
          // Use the real coutTotal from the backend (was undefined before
          // because CostKpiDto was missing the field in types.ts).
          coutTotal:          res.coutTotal ?? 0,
          coutFormateurs:     res.coutFormateurs ?? 0,
          coutMoyenSession:   res.coutMoyenParSession ?? 0,
          breakEvenStudents:  res.breakEven?.studentsNeeded ?? 0,
          prixMoyenFormation: res.breakEven?.avgPricePerStudent ?? 0,
          chiffreAffaires:    ca > 0 ? ca : (res.breakEven?.totalCost ?? 0),
        });
      })
      .catch(console.error);

    // Top formateurs (chart) ────────────────────────────────
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
          })),
        );
      })
      .catch(console.error);

    // Répartition (pie) ─────────────────────────────────────
    costApi
      .getRepartition(mapped)
      .then((res) => {
        console.log("🔥 KPI RESPONSE:", res);
        if (!res?.repartition) return;
        setRepartition([
          {
            label:  "Coût formateurs",
            value:  Math.round(res.repartition.coutFormateursPercent),
            couleur: "#1a7149",
          },
          {
            label:  "Coût logistique",
            value:  Math.round(res.repartition.coutLogistiquePercent),
            couleur: "#D97706",
          },
        ]);
      })
      .catch(console.error);

    // Trend (line chart) ────────────────────────────────────
    costApi
      .getTrend(mapped)
      .then((res) => {
        console.log("🔥 KPI RESPONSE:", res);
        if (!res?.points) return;
        setTrend(
          res.points.map((p: CostTrendPointDto) => ({
            mois:           p.mois,
            coutTotal:      p.coutTotal,
            coutParEtudiant: 0, // not returned by this endpoint
          })),
        );
      })
      .catch(console.error);

    // Sessions table ────────────────────────────────────────
    //
    // The backend paginates and sorts. We pass page/limit/sortBy/sortOrder
    // as part of mapped so the backend does the heavy lifting. DetailTable
    // receives only the current page's rows — it must NOT re-paginate them.


    
    costApi
      .getSessions(mapped)
      .then((res) => {
        console.log("🔥 KPI RESPONSE:", res);
        if (!res?.items) return;

        // Reconstruct the SessionCoutRow shape from the backend DTO.
        // capacite is estimated from tauxRemplissagePercent because the
        // backend DTO does not return raw capaciteMax per row.
        const ESTIMATED_CAPACITY = 15;

        setFilteredRows(
          res.items.map((r: SessionCostTableRowDto, i: number) => {
            const inscrits = Math.round(
              (r.tauxRemplissagePercent / 100) * ESTIMATED_CAPACITY,
            );
            return {
              id:                  String(i),
              sessionNom:          r.session,
              formation:           r.formation,
              formationId:         "",
              formateur:           r.formateur,
              formateurId:         "",
              // The sessions DTO has no per-row date; we leave it blank
              // rather than hardcoding "2025".
              dateDebut:           "",
              inscrits,
              capacite:            ESTIMATED_CAPACITY,
              coutDirectFormateur: r.coutDirectFormateur,
              fraisAnnexes:        r.fraisLogistique,
              coutTotal:           r.coutTotal,
              // Reconstruct CA: marge = CA − coutTotal → CA = coutTotal + marge
              ca:                  r.coutTotal + r.marge,
              marge:               r.marge,
              statut:
                r.statutRentabilite === "rentable"
                  ? "rentable"
                  : r.statutRentabilite === "seuil"
                  ? "seuil"
                  : "deficitaire",
            } satisfies SessionCoutRow;
          }),
        );

        // Store pagination metadata so DetailTable can show the correct
        // page count and the page buttons can update filters.page correctly.
        setPagination({
          page:       res.page,
          limit:      res.limit,
          total:      res.total,
          totalPages: res.totalPages,
        });
      })
      .catch(console.error);
  }, []);

  // Trigger on every filter change (including initial mount with DEFAULT_FILTERS)
  useEffect(() => {
    console.log("🚀 FETCH START");
    fetchAllMetrics(filters);
  }, [filters, fetchAllMetrics]);

  // ── Page-change handler (keeps other filters, bumps page only) ──
  function handlePageChange(newPage: number) {
    setFilters((prev) => ({ ...prev, page: newPage }));
  }

  return (
    <DashboardLayout>
      <div
        className="p-6 space-y-6 max-w-screen-2xl mx-auto"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ── Page header ────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "#2d4a3e", fontFamily: "'Sora', sans-serif" }}
            >
              Analyse des Coûts & Rentabilité
            </h1>
            <p className="text-xs mt-1" style={{ color: "#2d4a3e", opacity: 0.45 }}>
              Vue opérationnelle · Données en temps réel API
            </p>
          </div>
        </div>

        {/* ── Filters ────────────────────────────────────── */}
        <FiltersBar
          filters={filters}
          onChange={(next) => {
            // Any filter change resets to page 1 so we don't land on a
            // now-invalid page number after a refinement.
            setFilters({ ...next, page: 1 });
          }}
          formations={formationsList}
          formateurs={formateursList}
        />

        {/* ── KPIs ───────────────────────────────────────── */}
        <section>
          <KPISection data={kpiData} />
        </section>

        {/* ── Charts ─────────────────────────────────────── */}
        <section>
          <ChartsSection
            filteredRows={filteredRows}
            formateursCoutData={topFormateurs}
            repartitionData={repartition}
            trendData={trend}
          />
        </section>

        {/* ── Detail table ───────────────────────────────── */}
        <section>
          <DetailTable
            rows={filteredRows}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </section>

        <footer className="text-center pb-2">
          <p className="text-xs" style={{ color: "#2d4a3e", opacity: 0.25 }}>
            CentreForm BI · Coûts & Rentabilité
          </p>
        </footer>
      </div>
    </DashboardLayout>
  );
}
