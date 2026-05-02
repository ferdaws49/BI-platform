"use client";

import { useState } from "react";
import AlertsSection from "@/app/directeur/alerts/components/AlertsSection";
import type { AlertFilterOptions } from "@/app/directeur/alerts/components/alertTypes";

export default function AlertsPage() {
  // La page garde l'état des filtres et le transmet au composant enfant.
  // Ainsi, AlertsSection utilise vraiment la prop filters au lieu d'un état dupliqué.
  const [filters, setFilters] = useState<AlertFilterOptions>({
    type: "Tous",
    statut: "Non traité",
    periode: "7 derniers jours",
  });

  return <AlertsSection filters={filters} onFiltersChange={setFilters} />;
}
