"use client";

import { useState, useEffect } from "react";
import ChartsSection from "./components/ChartsSection";
import StudentsTable from "./components/StudentsTable";
import { useFilters } from "@/context/FilterContext";

type Student = {
  id: string;
  nom: string;
  formation: string;
  statut: "Actif" | "Terminé" | "Annulé";
  scoreMoyen: number;
  tauxCompletion: number;
  email?: string;
  promotion?: string;
};

const staticStudents: Student[] = [
  {
    id: "1",
    nom: "Alice Martin",
    formation: "Data Science Avancée",
    statut: "Actif",
    scoreMoyen: 85,
    tauxCompletion: 75,
    email: "alice@example.com",
    promotion: "Promo 2024-A",
  },
  {
    id: "2",
    nom: "Bob Dupont",
    formation: "Développement Full-Stack",
    statut: "Actif",
    scoreMoyen: 78,
    tauxCompletion: 60,
    email: "bob@example.com",
    promotion: "Promo 2024-A",
  },
  {
    id: "3",
    nom: "Claire Laurent",
    formation: "UX/UI Design",
    statut: "Terminé",
    scoreMoyen: 92,
    tauxCompletion: 100,
    email: "claire@example.com",
    promotion: "Promo 2024-B",
  },
  {
    id: "4",
    nom: "David Moreau",
    formation: "Cloud & DevOps",
    statut: "Actif",
    scoreMoyen: 72,
    tauxCompletion: 45,
    email: "david@example.com",
    promotion: "Promo 2024-B",
  },
  {
    id: "5",
    nom: "Emma Bernard",
    formation: "Intelligence Artificielle",
    statut: "Terminé",
    scoreMoyen: 88,
    tauxCompletion: 100,
    email: "emma@example.com",
    promotion: "Promo 2024-A",
  },
  {
    id: "6",
    nom: "Franck Thomas",
    formation: "Cybersécurité",
    statut: "Annulé",
    scoreMoyen: 55,
    tauxCompletion: 30,
    email: "franck@example.com",
    promotion: "Promo 2024-B",
  },
  {
    id: "7",
    nom: "Géraldine Petit",
    formation: "Data Science Avancée",
    statut: "Actif",
    scoreMoyen: 81,
    tauxCompletion: 82,
    email: "geraldine@example.com",
    promotion: "Promo 2024-A",
  },
  {
    id: "8",
    nom: "Hervé Richard",
    formation: "Développement Full-Stack",
    statut: "Terminé",
    scoreMoyen: 79,
    tauxCompletion: 100,
    email: "herve@example.com",
    promotion: "Promo 2024-B",
  },
  {
    id: "9",
    nom: "Isabelle Dubois",
    formation: "UX/UI Design",
    statut: "Actif",
    scoreMoyen: 86,
    tauxCompletion: 88,
    email: "isabelle@example.com",
    promotion: "Promo 2024-A",
  },
  {
    id: "10",
    nom: "Jacques Fontaine",
    formation: "Cloud & DevOps",
    statut: "Actif",
    scoreMoyen: 68,
    tauxCompletion: 50,
    email: "jacques@example.com",
    promotion: "Promo 2024-B",
  },
  {
    id: "11",
    nom: "Karine Mercier",
    formation: "Intelligence Artificielle",
    statut: "Actif",
    scoreMoyen: 90,
    tauxCompletion: 90,
    email: "karine@example.com",
    promotion: "Promo 2024-A",
  },
  {
    id: "12",
    nom: "Laurent Renaud",
    formation: "Cybersécurité",
    statut: "Terminé",
    scoreMoyen: 75,
    tauxCompletion: 100,
    email: "laurent@example.com",
    promotion: "Promo 2024-B",
  },
];

export default function ApprenantPage() {
  const [loading, setLoading] = useState(true);
  const { filters } = useFilters();
  const [students, setStudents] = useState<Student[]>(staticStudents);

  // ── Fetch from backend ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStudents = async () => {
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

        // Build query params
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

        const res = await fetch(
          `${base}/dashboard/pedagogique/apprenants${queryPart}`,
          { headers },
        );

        if (res.ok) {
          const data = await res.json();
          setStudents(data.students || staticStudents);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* ── Charts ── */}
      <ChartsSection filters={filters} />

      {/* ── Table ── */}
      <StudentsTable students={students} loading={loading} />
    </div>
  );
}
