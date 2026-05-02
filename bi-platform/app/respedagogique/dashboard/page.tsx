"use client";

import { useFilters } from "@/context/FilterContext";
import KPISection from "./components/Kpisection";

export default function RespedDashboardPage() {
  const { filters } = useFilters(); // 👈 من الـ context فقط

  return <KPISection filters={filters} />;
}
