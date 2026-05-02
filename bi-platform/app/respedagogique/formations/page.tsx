"use client";

import { useState, useEffect } from "react";
import KPISection from "./components/KPISection";
import ChartsSection from "./components/ChartsSection";
import FormationsTable from "./components/FormationsTable";
import { useFilters } from "@/context/FilterContext";

type Formation = {
  id: string;
  nom: string;
  nbInscrits: number;
  tauxSucces: number;
  tauxAbandon: number;
  tauxCompletion: number;
  satisfaction: number;
};

// ─── Static Fallback Data ─────────────────────────────────────────────────────

const staticFormations: Formation[] = [
  { id: "1", nom: "JavaScript Moderne", nbInscrits: 45, tauxSucces: 88.5, tauxAbandon: 6.7, tauxCompletion: 92.1, satisfaction: 4.3 },
  { id: "2", nom: "React Pro", nbInscrits: 52, tauxSucces: 85.3, tauxAbandon: 9.6, tauxCompletion: 89.5, satisfaction: 4.1 },
  { id: "3", nom: "TypeScript Avancé", nbInscrits: 38, tauxSucces: 92.1, tauxAbandon: 2.6, tauxCompletion: 95.2, satisfaction: 4.6 },
  { id: "4", nom: "Node.js Backend", nbInscrits: 41, tauxSucces: 81.7, tauxAbandon: 12.2, tauxCompletion: 85.4, satisfaction: 3.9 },
  { id: "5", nom: "Vue.js Fundamentals", nbInscrits: 36, tauxSucces: 86.1, tauxAbandon: 8.3, tauxCompletion: 91.7, satisfaction: 4.2 },
  { id: "6", nom: "Angular Ecosystem", nbInscrits: 29, tauxSucces: 79.3, tauxAbandon: 13.8, tauxCompletion: 82.8, satisfaction: 3.7 },
  { id: "7", nom: "Python Data Science", nbInscrits: 48, tauxSucces: 83.3, tauxAbandon: 10.4, tauxCompletion: 87.5, satisfaction: 4.0 },
  { id: "8", nom: "SQL & Databases", nbInscrits: 43, tauxSucces: 89.7, tauxAbandon: 4.7, tauxCompletion: 93.0, satisfaction: 4.4 },
];

// ─── Normaliseur : garantit que tous les champs sont du bon type ──────────────
// Indispensable car l'API peut renvoyer null / undefined / string à la place de number

const normalize = (f: any): Formation => ({
  id:             String(f.id ?? ""),
  nom:            f.nom ?? "",
  nbInscrits:     Number(f.nbInscrits ?? 0),
  tauxSucces:     Number(f.tauxSucces ?? 0),
  tauxAbandon:    Number(f.tauxAbandon ?? 0),
  tauxCompletion: Number(f.tauxCompletion ?? 0),
  satisfaction:   Number(f.satisfaction ?? 0),
});

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FormationsPage() {
  const { filters } = useFilters();
  const [formations, setFormations] = useState<Formation[]>(staticFormations);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const fetchFormations = async () => {
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
        const url =
          `http://localhost:5000/responsable/formations` +
          (queryString ? `?${queryString}` : "");

        const response = await fetch(url, { headers });
        if (!response.ok) {
          console.warn(`Failed to fetch formations: ${response.status}`);
          setFormations(staticFormations);
          return;
        }

        const data = await response.json();
        // ✅ normalize() appliqué ici — évite tous les NaN / undefined
        const raw = Array.isArray(data) ? data : (data.formations ?? []);
        setFormations(raw.length > 0 ? raw.map(normalize) : staticFormations);
      } catch (error) {
        console.error("Error fetching formations:", error);
        setFormations(staticFormations);
      } finally {
        setLoading(false);
      }
    };

    fetchFormations();
  }, [filters, isMounted]);

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Formations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Analyse détaillée de chaque formation et ses métriques clés
        </p>
      </div>

      <KPISection formations={formations} loading={loading} />

      <ChartsSection
        formations={formations}
        loading={loading}
        filters={filters as any}
      />

      <FormationsTable formations={formations} loading={loading} />
    </div>
  );
}