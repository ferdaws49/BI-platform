"use client";

import { useState } from "react";
import AlertsSection from "@/app/directeur/alerts/components/AlertsSection";
import type { AlertFilterOptions } from "@/app/directeur/alerts/components/alertTypes";

export default function AlertsPage() {
  const [filters, setFilters] = useState<AlertFilterOptions>({
    type: "Tous",
    statut: "Non traité",
    periode: "7 derniers jours",
  });

  return <AlertsSection filters={filters} onFiltersChange={setFilters} />;
}
