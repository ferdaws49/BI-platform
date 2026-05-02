
// AdminDashboardPage — Page du tableau de bord de l'admin

"use client"; // Directive Next.js : ce fichier utilise des hooks React (client uniquement)

// Import du composant principal d'affichage
import DashboardKPISection from "./components/DashboardKPISection";
// Note : ce composant contient toutes les données, hooks et graphiques du dashboard.

// ============================================================
// COMPOSANT DE LA PAGE
// ============================================================
export default function AdminDashboardPage() {
  // Rend directement le composant DashboardKPISection.
  // Toutes les données et la logique sont encapsulées dans ce composant.
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 pb-12 w-full">
      <DashboardKPISection />
    </div>
  );
}