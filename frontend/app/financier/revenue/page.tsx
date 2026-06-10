"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/layout/financier/DashboardLayout";
import RevenueFiltersBar from "./components/filtre/RevenueFiltersBar";
import { revenueApi } from "@/lib/financier-revenue.api";

const CATab = dynamic(() => import("./components/ca/CATab"), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const PaiementsTab = dynamic(
  () => import("./components/paiements/payementsTab"),
  { ssr: false, loading: () => <TabSkeleton /> }
);



function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-border bg-muted animate-pulse"
          />
        ))}
      </div>
      <div
        className="h-64 rounded-xl border border-border bg-muted animate-pulse"
      />
    </div>
  );
}

type TabId = "ca" | "paiements";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "ca", label: "Chiffre d'Affaires", icon: "📈" },
  { id: "paiements", label: "Paiements & Encaissements", icon: "🧾" },
];

type Formation = {
  id: number;
  title: string;
};


export default function RevenusPage() {
  const [activeTab, setActiveTab] = useState<TabId>("ca");
  // Initialise avec l'année courante pour avoir des données dès le premier render
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState<Record<string, any>>({
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`,
  });
  const [formations, setFormations] = useState<Formation[]>([]);

  useEffect(() => {
  async function load() {
    try {
      const data = await revenueApi.getFormationsList();
      console.log("FORMATIONS API 👉", data);
      
      // ✅ SÉCURITÉ : si le backend retourne { data: [...] } ou un objet
      const list: Formation[] = Array.isArray(data) ? data : [];
      setFormations(list);
    } catch (err) {
      console.error(err);
      setFormations([]); // ← Jamais undefined
    }
  }

  load();
}, []);



  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Page header + filtres (même niveau que /cout) */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Revenus & Facturation
            </h1>
            <p className="text-xs mt-1 text-muted-foreground">
              Pilotage financier complet · Exercice {currentYear}
            </p>
          </div>
        </div>

        <RevenueFiltersBar onChange={setFilters} formations={formations} />

        {/* Tabs navigation */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground border border-border hover:bg-accent/20"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content — filters transmis à chaque onglet */}
        <div>
          {activeTab === "ca" && <CATab filters={filters} />}
          {activeTab === "paiements" && <PaiementsTab filters={filters} />}
        </div>

        {/* Footer */}
        <footer className="text-center pb-2">
          <p className="text-xs text-muted-foreground/60">
            MBICenter · Revenus & Facturation · Exercice {currentYear}
          </p>
        </footer>
      </div>
    </DashboardLayout>
  );
}
