'use client'

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/apprenant/Sidebar';
import Navbar from '@/components/apprenant/Navbar';
import DashboardShell from '@/components/apprenant/dashboardShared';

export default function ApprenantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // ✅ SEULE la page d'accueil n'a pas de sidebar
  const isWelcomePage = pathname === '/apprenant';

  return (
    <DashboardShell
      sidebar={isWelcomePage ? null : <Sidebar />}
      navbar={<Navbar />}
    >
      {children}
    </DashboardShell>
  );
}