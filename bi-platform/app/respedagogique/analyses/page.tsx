"use client";

import ChartsSection from "./components/ChartsSection";
import { useFilters } from "@/context/FilterContext";

export default function AnalysesPage() {
  const { filters } = useFilters();

  return (
    <div className="space-y-6">
      <ChartsSection filters={filters} />
    </div>
  );
}
