"use client";

// /app/directeur/export/page.tsx
import { useState } from "react";
import ExportSection from "@/app/directeur/export/components/ExportSection";
// Ce type décrit les options de l'export, y compris le format et les filtres appliqués.
type ExportOptions = {
  format: "pdf" | "excel" | "csv";
  periode: string;
  formation: string;
  formateur: string;
  rapports: {
    strategique: boolean;
    financiere: boolean;
    performance: boolean;
    qualite: boolean;
  };
};

export default function ExportPage() {
  const [options, setOptions] = useState<ExportOptions>({
    format: "pdf",
    periode: "30 derniers jours",
    formation: "Tous",
    formateur: "Tous",
    rapports: {
      strategique: true,
      financiere: true,
      performance: true,
      qualite: true,
    },
  });

  return <ExportSection options={options} setOptions={setOptions} />;
}
