"use client";
import { useState, useEffect } from "react";
import { mlApi } from "@/lib/ml-api";
import { mapPredictResponse } from "@/app/financier/predictive/utils/mlMappers";
import DashboardLayout from "@/components/layout/financier/DashboardLayout";
import FiltersBar from "./components/FiltersBar";
import KPICards from "./components/KPICards";
import ForecastChart from "./components/ForcastChart";
import RiskTable from "./components/RiskTable";
import InsightsSection from "./components/InsightsSection";
import RecommendationsSection from "./components/RecommendationsSection";
import { FilterState, Formation, Formateur } from "./types";
import { revenueApi } from "@/lib/financier-revenue.api";

export default function PredictiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [caPoints, setCaPoints] = useState([]);
  const [horizon, setHorizon] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  
  const [formations, setFormations] = useState<Formation[]>([]);
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);

  // Filtres par défaut (1er Janvier de l'année en cours)
  const [filters, setFilters] = useState<FilterState>({
    period: "Mois",
    dateFrom: `${new Date().getFullYear()}-01-01`,
    dateTo: new Date().toISOString().split('T')[0],
    formationId: "all",
    formateurId: "all",
    sessionType: "Tout",
  });

  // Charger les listes de filtres une fois au début
  useEffect(() => {
    async function loadLists() {
      try {
        const [formationsList, formateursList] = await Promise.all([
          revenueApi.getFormationsList(),
          revenueApi.getFormateursList()
        ]);
        
        // Conversion explicite en types attendus
        const mappedFormations = formationsList.map((f: any) => ({
          id: String(f.id),
          title: f.title
        }));
        
        const mappedFormateurs = formateursList.map((f: any) => ({
          id: String(f.id),
          name: f.name
        }));

        setFormations(mappedFormations);
        setFormateurs(mappedFormateurs);
      } catch (err) {
        console.error("Erreur lors du chargement des formations/formateurs:", err);
        setFormations([{ id: "all", title: "Toutes les formations" }]);
        setFormateurs([{ id: "all", name: "Tous les formateurs" }]);
      }
    }
    loadLists();
  }, []);

  // CHARGEMENT GLOBAL
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. On récupère les points du graphique (Historique ou Prediction)
        let resCA;
        if (horizon === null) {
          resCA = await mlApi.getCAHistorique(filters);
        } else {
          resCA = await mlApi.predictCA(filters, horizon);
        }
        
        // 2. On récupère les risques sessions
        const resPredict = await mlApi.predictDeficit(filters);

        // 3. On branche tout ensemble
        const points = resCA.points || [];
        setCaPoints(points);
        setData(mapPredictResponse(resPredict, points));

      } catch (err) {
        console.error("Erreur API:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filters, horizon]); // <--- TRÈS IMPORTANT : Réagit aux filtres et au bouton 1M/3M

  return (
    <DashboardLayout>
      <main className="p-8 space-y-8 overflow-y-auto h-screen bg-[#efefea]/30">
        <h1 className="text-2xl font-bold text-[#2d4a3e]">Analyse Prédictive</h1>
        
        <FiltersBar 
          onFilterChange={setFilters} 
          formations={formations} 
          formateurs={formateurs} 
        />

        {data && <KPICards data={data.kpi} loading={loading} />}

        <ForecastChart 
          data={caPoints} 
          horizon={horizon as any} 
          onHorizonChange={setHorizon} 
          showPrediction={horizon !== null}
          loading={loading}
        />

        {data && <RiskTable data={data.riskSessions} loading={loading} />}
        {data && <InsightsSection insights={data.insights} loading={loading} />}
        {data && <RecommendationsSection recommendations={data.recommendations} loading={loading} />}
      </main>
    </DashboardLayout>
  );
}