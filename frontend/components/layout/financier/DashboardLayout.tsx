"use client";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen font-sans bg-background transition-colors duration-300">
      <Sidebar role="financier" />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Pilotage Financier"
          subtitle="Exercice 2026"
          showFilters={false}
        />

        <main className="p-6 overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
