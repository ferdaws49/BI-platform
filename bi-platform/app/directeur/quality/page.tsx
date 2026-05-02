"use client";

import QualitySection from "@/app/directeur/quality/components/QualitySection";
import { useFilters } from "@/context/FilterContext";

export default function QualityPage() {
  // La page qualité lit directement les filtres globaux du header.
  const { filters } = useFilters();

  return <QualitySection filters={filters} />;
}
