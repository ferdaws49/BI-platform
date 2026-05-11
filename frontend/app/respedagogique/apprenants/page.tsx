"use client";

// ─── CORRECTIONS APPORTÉES ────────────────────────────────────────────────────
//
// 1. Endpoint corrigé : /dashboard/pedagogique/apprenants
//                    → /responsable/apprenants
//
// 2. Structure de réponse alignée avec le backend :
//    data.students         → StudentsTable (était data.students ✅ mais endpoint faux)
//    data.studentStatus    → ChartsSection (Pie)
//    data.scoreEvolution   → ChartsSection (Line)
//    data.formationSuccess → ChartsSection (Bar)
//
// 3. Un seul fetch depuis page.tsx — les données sont passées en props à ChartsSection
//    (avant : deux fetches séparés, page.tsx ET ChartsSection.tsx appelaient le même endpoint)
//
// 4. Filtre "statut" transmis au backend (était envoyé en "type" par erreur pour l'appenant)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react";
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

type StudentStatus = { status: "Actif" | "Terminé" | "Annulé"; count: number };
type ScoreEvolution = { date: string; score: number };
type FormationSuccessRate = { formation: string; tauxReussite: number };

// ─── Static fallback — inchangé ──────────────────────────────────────────────
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

const staticStudentStatus: StudentStatus[] = [
  { status: "Actif", count: 187 },
  { status: "Terminé", count: 142 },
  { status: "Annulé", count: 21 },
];

const staticScoreEvolution: ScoreEvolution[] = [
  { date: "Sem 1", score: 65 },
  { date: "Sem 2", score: 68 },
  { date: "Sem 3", score: 72 },
  { date: "Sem 4", score: 75 },
  { date: "Sem 5", score: 78 },
  { date: "Sem 6", score: 81 },
];

const staticFormationSuccess: FormationSuccessRate[] = [
  { formation: "Data Science", tauxReussite: 91 },
  { formation: "Full-Stack", tauxReussite: 87 },
  { formation: "UX/UI", tauxReussite: 84 },
  { formation: "Cloud", tauxReussite: 78 },
  { formation: "IA", tauxReussite: 95 },
  { formation: "Cybersécurité", tauxReussite: 72 },
];

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ApprenantPage() {
  const { filters } = useFilters();
  const [loading, setLoading] = useState(true);

  // Toutes les données viennent d'un seul fetch
  const [students, setStudents] = useState<Student[]>(staticStudents);
  const [studentStatus, setStudentStatus] =
    useState<StudentStatus[]>(staticStudentStatus);
  const [scoreEvolution, setScoreEvolution] =
    useState<ScoreEvolution[]>(staticScoreEvolution);
  const [formationSuccess, setFormationSuccess] = useState<
    FormationSuccessRate[]
  >(staticFormationSuccess);

  // ─── Fetch unique ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("access_token")
            : null;
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        // ✅ Endpoint corrigé
        const params = new URLSearchParams();
        if (filters.periode && filters.periode !== "Ce mois")
          params.append("periode", filters.periode);
        if (filters.formation && filters.formation !== "Tous")
          params.append("formation", filters.formation);
        if (filters.formateur && filters.formateur !== "Tous")
          params.append("formateur", filters.formateur);
        if (filters.statut && filters.statut !== "Tous")
          params.append("statut", filters.statut);

        const query = params.toString() ? `?${params.toString()}` : "";

        const res = await fetch(
          `http://localhost:5000/responsable/apprenants${query}`,
          { headers },
        );

        if (res.ok) {
          const data = await res.json();
          // Le backend retourne { students, studentStatus, scoreEvolution, formationSuccess }
          if (data.students?.length) setStudents(data.students);
          if (data.studentStatus?.length) setStudentStatus(data.studentStatus);
          if (data.scoreEvolution?.length)
            setScoreEvolution(data.scoreEvolution);
          if (data.formationSuccess?.length)
            setFormationSuccess(data.formationSuccess);
        }
        // Si res pas ok → static data déjà initialisées, pas de crash
      } catch (err) {
        console.error("Fetch apprenants error:", err);
        // Fallback silencieux : static data déjà en state
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [filters]);

  // ─── Filtrage côté client (statut) ───────────────────────────────────────
  // Le backend filtre déjà, mais on garde un filtre client pour la réactivité UX
  const filteredStudents = useMemo(() => {
    if (!filters.statut || filters.statut === "Tous") return students;
    return students.filter((s) => s.statut === filters.statut);
  }, [students, filters.statut]);

  return (
    <div className="space-y-6">
      {/* ChartsSection reçoit les données en props — plus de fetch interne */}
      <ChartsSection
        loading={loading}
        studentStatus={studentStatus}
        scoreEvolution={scoreEvolution}
        formationSuccess={formationSuccess}
      />

      <StudentsTable students={filteredStudents} loading={loading} />
    </div>
  );
}
