"use client";
import { useFilters } from "@/context/FilterContext";
import FinanceSection from "@/app/directeur/finance/components/FinanceSection";

export default function FinancePage() {
  const { filters } = useFilters();

  return (
    <FinanceSection
      filters={{
        periode: filters.periode, // envoyer directement sans conversion
        formation: filters.formation ?? "Tous",
        type: filters.type ?? "Tous",
        statut: filters.statut ?? "Tous",
      }}
    />
  );
}
