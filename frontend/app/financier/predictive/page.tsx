"use client";

import { useState, useEffect } from "react";
import { Brain, RefreshCw } from "lucide-react";

import FiltersBar from "./components/FiltersBar";
import KPICards from "./components/KPICards";
import ForecastChart from "./components/ForcastChart";
import RiskTable from "./components/RiskTable";
import InsightsSection from "./components/InsightsSection";
import RecommendationsSection from "./components/RecommendationsSection";

import {
  FORMATIONS,
  FORMATEURS,
  KPI_DATA,
  RISK_SESSIONS,
  INSIGHTS,
  RECOMMENDATIONS,
} from "./mockdata";
import type { FilterState } from "./types";
import DashboardLayout from "@/components/layout/financier/DashboardLayout";

export default function DashboardBIPage() {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    period: "Mois",
    formationId: "all",
    sessionType: "Tout",
    formateurId: "all",
  });

  // Simulate initial data load
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  function handleFilterChange(newFilters: FilterState) {
    setFilters(newFilters);
    setLoading(true);
    // Simulate re-fetch
    setTimeout(() => setLoading(false), 800);
  }

  function handleRefresh() {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 flex flex-col gap-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10"
            >
              <Brain size={22} className="text-primary" />
            </div>
            <div>
              <h1
                className="text-xl font-bold tracking-tight text-foreground"
              >
                Business Intelligence Dashboard
              </h1>
              <p className="text-xs text-muted-foreground/70">
                Prédictions & analyse de risques — Centre de Formation
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-border bg-card hover:bg-accent/20"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <FiltersBar formations={FORMATIONS} formateurs={FORMATEURS} onFilterChange={handleFilterChange} />

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <KPICards data={KPI_DATA} loading={loading} />

        {/* ── CA Forecast Chart ──────────────────────────────────────────── */}
        <ForecastChart loading={loading} />

        {/* ── Risk Sessions Table ────────────────────────────────────────── */}
        <RiskTable data={RISK_SESSIONS} loading={loading} />

        {/* ── Insights ───────────────────────────────────────────────────── */}
        <InsightsSection insights={INSIGHTS} loading={loading} />

        {/* ── Recommendations ────────────────────────────────────────────── */}
        <RecommendationsSection recommendations={RECOMMENDATIONS} loading={loading} />

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between py-3 border-t text-xs"
          style={{ borderColor: "rgba(229,234,221,0.7)", color: "#2d4a3e", opacity: 0.4 }}
        >
          <span>Dashboard BI — Exercice 2025</span>
          <span>Dernière mise à jour : {new Date().toLocaleDateString("fr-TN")}</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
