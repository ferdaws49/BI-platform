"use client";

import StrategicReportPage from "@/app/directeur/reports/components/StrategicReportPage";
import { useFilters } from "@/context/FilterContext";

export default function DirecteurReportsPage() {
  // On lit les filtres globaux depuis le contexte partagé du layout directeur.
  const { filters } = useFilters();

  // La page ne contient presque pas de logique :
  // elle transmet simplement les filtres au composant métier principal.
  return <StrategicReportPage filters={filters} />;
}
