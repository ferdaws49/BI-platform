"use client";

import { useState, useEffect } from "react";
import ChartsSection from "./components/ChartsSection";
import PerformanceTable from "./components/PerformanceTable";
import { useFilters } from "@/context/FilterContext";

/**
 * Type représentant les données de performance d'un formateur.
 * Ces données sont utilisées pour les graphiques et le tableau.
 */
type FormateurPerf = {
  id: string;
  nom: string;
  specialite: string;
  scoreEfficacite: number; // Score global (0-100)
  tauxReussite: number;    // % d'apprenants ayant réussi (0-100)
  satisfaction: number;    // Note moyenne donnée par les apprenants (0-5)
  sessionsAnimées: number; // Nombre total de sessions réalisées
  totalApprenants: number; // Nombre total d'apprenants formés
};

// Données statiques utilisées en cas d'erreur API ou pendant le chargement initial
const staticFormateurs: FormateurPerf[] = [
  {
    id: "1",
    nom: "Marie Dupont",
    specialite: "Data Science",
    scoreEfficacite: 94,
    tauxReussite: 91,
    satisfaction: 4.8,
    sessionsAnimées: 48,
    totalApprenants: 256,
  },
  {
    id: "2",
    nom: "Jean Martin",
    specialite: "Développement Web",
    scoreEfficacite: 91,
    tauxReussite: 87,
    satisfaction: 4.6,
    sessionsAnimées: 36,
    totalApprenants: 189,
  },
  {
    id: "3",
    nom: "Sophie Laurent",
    specialite: "Design UX/UI",
    scoreEfficacite: 88,
    tauxReussite: 84,
    satisfaction: 4.5,
    sessionsAnimées: 42,
    totalApprenants: 223,
  },
  {
    id: "4",
    nom: "Pierre Moreau",
    specialite: "Cloud & DevOps",
    scoreEfficacite: 85,
    tauxReussite: 78,
    satisfaction: 4.3,
    sessionsAnimées: 30,
    totalApprenants: 159,
  },
  {
    id: "5",
    nom: "Claire Bernard",
    specialite: "Cybersécurité",
    scoreEfficacite: 82,
    tauxReussite: 72,
    satisfaction: 4.1,
    sessionsAnimées: 25,
    totalApprenants: 134,
  },
];

/**
 * Page de gestion et de suivi des formateurs pour le Responsable Pédagogique.
 * Elle affiche des indicateurs clés (KPI), des graphiques de performance et un tableau détaillé.
 */
export default function FormateursPage() {
  const [loading, setLoading] = useState(true);
  const { filters } = useFilters(); // Récupération des filtres globaux (période, formation, etc.)
  const [formateurs, setFormateurs] = useState<FormateurPerf[]>(staticFormateurs);

  // ── Récupération des données depuis le Backend ────────────────────────────────
  useEffect(() => {
    const fetchFormateurs = async () => {
      setLoading(true);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("access_token")
            : null;
        
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};
          
        const base = "http://localhost:5000";

        // Construction des paramètres de requête basés sur les filtres actifs
        const params = new URLSearchParams();
        if (filters.periode && filters.periode !== "Tous" && filters.periode !== "Ce mois")
          params.append("periode", filters.periode);
        if (filters.formation && filters.formation !== "Tous")
          params.append("formation", filters.formation);
        if (filters.formateur && filters.formateur !== "Tous")
          params.append("formateur", filters.formateur);
        if (filters.type && filters.type !== "Tous")
          params.append("type", filters.type);
        if (filters.statut && filters.statut !== "Tous")
          params.append("statut", filters.statut);

        const queryString = params.toString();
        const queryPart = queryString ? `?${queryString}` : "";

        // Appel à l'API dédiée aux statistiques des formateurs
        const res = await fetch(
          `${base}/dashboard/pedagogique/formateurs${queryPart}`,
          { headers },
        );

        if (res.ok) {
          const data = await res.json();
          // Mise à jour de l'état avec les données réelles ou fallback sur les données statiques
          setFormateurs(data.formateurs || staticFormateurs);
        }
      } catch (err) {
        console.error("Erreur de récupération des formateurs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFormateurs();
  }, [filters]); // Relancer la récupération à chaque changement de filtre

  return (
    <div className="space-y-6">
      {/* Section des graphiques (Radar, Line, Bar) et des KPI de haut de page */}
      <ChartsSection filters={filters} />

      {/* Tableau détaillé de la performance individuelle de chaque formateur */}
      <PerformanceTable formateurs={formateurs} loading={loading} />
    </div>
  );
}
