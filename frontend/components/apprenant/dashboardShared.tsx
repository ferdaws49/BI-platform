import React from 'react';

interface DashboardShellProps {
  sidebar: React.ReactNode;
  navbar: React.ReactNode;
  children: React.ReactNode;
}

export default function DashboardShell({ sidebar, navbar, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-[#f9f8f3] font-sans overflow-hidden">
      {/* 1. Sidebar Fixe à gauche */}
      <div className="w-64 flex-shrink-0 border-r border-gray-100 bg-white">
        {sidebar}
      </div>

      {/* 2. Zone de droite (Navbar + Content) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Navbar en haut */}
        {navbar}

        {/* Zone de contenu défilante */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}