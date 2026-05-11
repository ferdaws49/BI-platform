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
            className="h-28 rounded-2xl"
            style={{ background: "rgba(229,234,221,0.5)" }}
          />
        ))}
      </div>
      <div
        className="h-64 rounded-2xl"
        style={{ background: "rgba(229,234,221,0.5)" }}
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
      const data = await revenueApi.getFormationsList();
      console.log("FORMATIONS API 👉", data);
      setFormations(data);
    }

    load();
  }, []);



  return (
    <DashboardLayout>
      <div
        className="p-6 space-y-6 max-w-screen-2xl mx-auto"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "#2d4a3e", fontFamily: "'Sora', sans-serif" }}
            >
              Revenus & Facturation
            </h1>
            <p
              className="text-xs mt-1"
              style={{ color: "#2d4a3e", opacity: 0.45 }}
            >
              Pilotage financier complet · Exercice {currentYear}
            </p>
          </div>

          {/* Barre de filtres globale — partagée par tous les onglets */}
          <RevenueFiltersBar onChange={setFilters}
          formations={formations}
          />
        </div>

        {/* Tabs navigation */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={
                activeTab === tab.id
                  ? { background: "#2d4a3e", color: "#fff" }
                  : {
                      background: "rgba(255,255,255,0.65)",
                      color: "#2d4a3e",
                      border: "1px solid rgba(229,234,221,0.9)",
                    }
              }
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
          <p
            className="text-xs"
            style={{ color: "#2d4a3e", opacity: 0.25 }}
          >
            CentreForm BI · Revenus & Facturation · Exercice {currentYear}
          </p>
        </footer>
      </div>
    </DashboardLayout>
  );
}
