import React from 'react';

interface DashboardShellProps {
  sidebar: React.ReactNode;
  navbar: React.ReactNode;
  children: React.ReactNode;
}

export default function DashboardShell({ sidebar, navbar, children }: DashboardShellProps) {
  const hasSidebar = !!sidebar;

  return (
    <div className="flex min-h-screen bg-[#f9f8f3] font-sans overflow-hidden">
      {/* Sidebar — conditionnelle */}
      {hasSidebar && (
        <div className="w-64 flex-shrink-0 border-r border-gray-100 bg-white">
          {sidebar}
        </div>
      )}

      {/* Zone principale */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Navbar */}
        {navbar}

        {/* Contenu */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className={hasSidebar ? 'p-8 max-w-7xl mx-auto' : 'h-full'}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}