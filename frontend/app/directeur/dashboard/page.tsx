"use client";

import { useFilters } from "@/context/FilterContext";
import KPISection from "@/app/directeur/dashboard/components/KPISection";

export default function Dashboard() {
  const { filters } = useFilters(); // here we use it the context not the usestate

  return <KPISection filters={filters} />;
}
