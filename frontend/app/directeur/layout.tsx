
"use client";

import { usePathname } from "next/navigation";
import { FilterProvider } from "@/context/FilterContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { DirecteurProvider, useDirecteurContext } from "./DirecteurContext";

const PAGES_AVEC_FILTRE = [
  "/directeur/dashboard",
  "/directeur/finance",
  "/directeur/reports",
  "/directeur/quality",
  // ajouter d'autres pages si nécessaire
];

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useDirecteurContext();
  const showFilters = PAGES_AVEC_FILTRE.includes(pathname);

  return (
    <div className="flex min-h-screen font-sans bg-background transition-colors duration-300">
      <Sidebar role="directeur" />

      <div className="flex-1 flex flex-col">
        <Header
          title={t.dashboard.welcome}
          subtitle={t.dashboard.subtitle}
          showFilters={showFilters}
        />

        <main className="p-6 overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FilterProvider>
      <DirecteurProvider>
        <LayoutContent>{children}</LayoutContent>
      </DirecteurProvider>
    </FilterProvider>
  );
}
