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
  const year = new Date().getFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
};

export default function FinancialDashboardPage() {

  // États pour stocker les données du back
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [revenueData, setRevenueData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [formationData, setFormationData] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  console.log("CALLING:", "dashboard/formations");

  const [formations, setFormations] = useState([]);

  // État pour les filtres
 const [filters, setFilters] = useState({
  ...getInitialYearDates(),
  status: undefined,
  formationId: undefined,
});


  

  const loadAllData = async () => {
    setLoading(true);
    try {
      // On lance tous les appels en même temps pour gagner du temps
      const [dataKpis, dataRev, dataCat, dataForm, dataSess, dataFormations] = await Promise.all([
        getdashboard('dashboard/kpis', filters),
        getdashboard('dashboard/charts/revenue-by-month', filters),
        getdashboard('dashboard/charts/revenue-cost-by-category', filters),
        getdashboard('dashboard/charts/ca-by-formation', filters),
        getdashboard('dashboard/sessions-performance', filters),
        
        getdashboard('dashboard/formations'),
      ]);
      console.log("KPIS =", dataKpis);
      console.log("FILTERS SENT => sessions:", filters);
      

      setKpis(dataKpis);
      setRevenueData(dataRev);
      setCategoryData(dataCat);
      setFormationData(dataForm);
      setSessions(dataSess.items ?? dataSess); // .items car ton DTO NestJS est paginé
      setFormations(dataFormations);
      
    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("FILTERS =", filters);
    loadAllData();
  }, [filters]); // Re-charge les données dès qu'un filtre change

  

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        {/* Filters */}
        <FiltersBar onFilterChange={(newFilters) =>
         setFilters((prev) => ({ ...prev,
           ...newFilters,
          }))
        }
        formations={formations}
       />
          {loading ? (
           <div className="text-center py-10">Chargement des données...</div>
        ) : (
          <>

        {/* KPI Cards */}
        <section>
              {/* On adapte les clés du back (caRealise) aux clés attendues par le composant Front */}
              {kpis && <KPICards data={ kpis } />}
            </section>

        {/* Charts */}
        <section>
          <ChartsSection 
           revenueByMonth={revenueData} 
                categoryStats={categoryData}
                formationStats={formationData}
          />
        </section>  

        {/* Performance Table */}
        <section>
          <PerformanceTable data={sessions} />
        </section>
        </>
        )}

        {/* Footer */}
        <footer className="text-center pb-2">
          <p className="text-xs" style={{ color: "#2d4a3e", opacity: 0.3 }}>
            CentreForm BI · Pilotage Financier · Données de démonstration — Exercice 2025
          </p>
        </footer>
      </div>
    </DashboardLayout>
  );
}