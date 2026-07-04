"use client";

import DashboardLayout from "@/components/layout/financier/DashboardLayout";
import FiltersBar from "./components/filters";
import KPICards from "./components/KPI";
import ChartsSection from "./components/charts";
import PerformanceTable from "./components/PerformanceTable";
import { getdashboard } from "@/lib/financier-dashboard.api";
import { useEffect, useState } from "react";
import { KPIData } from "./types";

const getInitialYearDates = () => {
  const now = new Date();
  const format = (d: Date) => d.toISOString().split("T")[0];
  return {
    startDate: `${now.getFullYear()}-01-01`,
    endDate: format(now),
  };
};

const initialFilters = {
  ...getInitialYearDates(),
  status: undefined as string | undefined,
  formationId: undefined as number | undefined,
  page: 1,
};

export default function FinancialDashboardPage() {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [revenueData, setRevenueData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [formationData, setFormationData] = useState([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formations, setFormations] = useState([]);
  const [filters, setFilters] = useState(initialFilters);

  // ── loadAllData reçoit les filtres en paramètre ──
  const loadAllData = async (f: typeof initialFilters) => {
    setLoading(true);
    try {
      const [dataKpis, dataRev, dataCat, dataForm, dataSess, dataFormations] = await Promise.all([
        getdashboard('dashboard/kpis', f),
        getdashboard('dashboard/charts/revenue-by-month', f),
        getdashboard('dashboard/charts/revenue-cost-by-category', f),
        getdashboard('dashboard/charts/ca-by-formation', f),
        getdashboard('dashboard/sessions-performance', f),
        getdashboard('dashboard/formations'),
      ]);

      console.log("=== FILTERS UTILISÉS ===", f);
      console.log("=== SESSIONS REÇUES ===", dataSess.total);

      setKpis(dataKpis);
      setRevenueData(dataRev);
      setCategoryData(dataCat);
      setFormationData(dataForm);
      setSessions(dataSess.items ?? dataSess);
      setFormations(dataFormations);

    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── useEffect passe filters directement ──
  useEffect(() => {
    loadAllData(filters);
  }, [filters]);

  const exerciceYear = filters?.startDate
    ? new Date(filters.startDate).getFullYear()
    : new Date().getFullYear();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <FiltersBar
          onFilterChange={(newFilters) =>
            setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
          }
          formations={formations}
        />

        {loading ? (
          <div className="text-center py-10">Chargement des données...</div>
        ) : (
          <>
            <section>
              {kpis && <KPICards data={kpis} />}
            </section>

            <section>
              <ChartsSection
                revenueByMonth={revenueData}
                categoryStats={categoryData}
                formationStats={formationData}
              />
            </section>

            <section>
              <PerformanceTable data={sessions} />
            </section>
          </>
        )}

        <footer className="text-center pb-2">
          <p className="text-xs" style={{ color: "#2d4a3e", opacity: 0.3 }}>
            CentreForm BI · Pilotage Financier · Données de démonstration — Exercice {exerciceYear}
          </p>
        </footer>
      </div>
    </DashboardLayout>
  );
}