"use client";

import { useState, useEffect } from "react";
import ChartsSection from "./components/ChartsSection";
import PerformanceTable from "./components/PerformanceTable";
import { useFilters } from "@/context/FilterContext";

/**
 * Source de vérité unique du type FormateurPerf.
 * Importé par ChartsSection et PerformanceTable — ne pas redéfinir ailleurs.
 */
export type FormateurPerf = {
  id: number;
  nom: string;
  specialite: string;
  scoreEfficacite: number; // 0-100
  tauxReussite: number; // 0-100
  satisfaction: number; // 0-5 brut (0 = aucun avis encore)
  sessionsAnimees: number;
  totalApprenants: number; // Nombre d'apprenants uniques (calculé par le backend)
  radarScores: {
    efficacite: number;
    reussite: number;
    satisfaction: number | null; // null = pas de données satisfaction
    activite: number;
    engagement: number;
  };
};

export const staticFormateurs: FormateurPerf[] = [
  {
    id: 1,
    nom: "Aucun formateur",
    specialite: "—",
    scoreEfficacite: 0,
    tauxReussite: 0,
    satisfaction: 0,
    sessionsAnimees: 0,
    totalApprenants: 0,
    radarScores: {
      efficacite: 0,
      reussite: 0,
      satisfaction: null,
      activite: 0,
      engagement: 0,
    },
  },
];

export default function FormateursPage() {
  const [loading, setLoading] = useState(true);
  const { filters } = useFilters();
  const [formateurs, setFormateurs] =
    useState<FormateurPerf[]>(staticFormateurs);

  useEffect(() => {
    const fetchPerformances = async () => {
      setLoading(true);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("access_token")
            : null;
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const params = new URLSearchParams();
        if (
          filters.periode &&
          filters.periode !== "Tous" &&
          filters.periode !== "Ce mois"
        )
          params.append("periode", filters.periode);
        if (filters.formation && filters.formation !== "Tous")
          params.append("formation", filters.formation);
        if (filters.formateur && filters.formateur !== "Tous")
          params.append("formateur", filters.formateur);
        if (filters.statut && filters.statut !== "Tous")
          params.append("statut", filters.statut);

        const qs = params.toString();
        const url = `http://localhost:5000/responsable/formateurs/performances${qs ? `?${qs}` : ""}`;

        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.formateurs?.length > 0) {
            setFormateurs(data.formateurs);
          }
        }
      } catch (err) {
        console.error("Erreur fetch performances formateurs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformances();
  }, [filters]);

  return (
    <div className="space-y-6">
      <ChartsSection formateurs={formateurs} loading={loading} />
      <PerformanceTable formateurs={formateurs} loading={loading} />
    </div>
  );
}
