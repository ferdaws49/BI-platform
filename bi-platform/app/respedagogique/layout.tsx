"use client";

import { usePathname } from "next/navigation";
import { FilterProvider } from "@/context/FilterContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { RespedProvider, useRespedContext } from "./RespedContext";

// 👇 pages où le filtre doit apparaître
const PAGES_AVEC_FILTRE = [
  "/respedagogique/dashboard",
  "/respedagogique/formations",
  "/respedagogique/apprenants",
  "/respedagogique/analyses",
  "/respedagogique/formateurs",
  ""
  // أضف باقي الصفحات اللي تحتاج فلتر
];

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useRespedContext();
  const showFilters = PAGES_AVEC_FILTRE.includes(pathname);

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
      <Sidebar role="responsablePedagogique" />
      <div className="flex-1 flex flex-col">
        <Header
          title={t.dashboard.welcome}
          subtitle={t.dashboard.subtitle}
          showFilters={showFilters}
        />
        <main className="p-6 overflow-y-auto">{children}</main>
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
      <RespedProvider>
        <LayoutContent>{children}</LayoutContent>
      </RespedProvider>
    </FilterProvider>
  );
}
