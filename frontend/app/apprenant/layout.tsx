'use client'

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/apprenant/Sidebar';
import Navbar from '@/components/apprenant/Navbar';
import DashboardShell from '@/components/apprenant/dashboardShared';

export default function ApprenantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const cleanPath = pathname?.replace(/\/$/, '') || '';

  const isWelcome = cleanPath === '/apprenant';
  const isCatalogue = cleanPath === '/apprenant/catalogue';
  const isNoSidebar = isWelcome || isCatalogue;

  // ✅ Notifications masquées UNIQUEMENT sur Welcome et Catalogue (première visite)
  const showNotifications = !isWelcome && !isCatalogue;

  return (
    <DashboardShell
      sidebar={isNoSidebar ? null : <Sidebar />}
      navbar={
        <Navbar 
          showSearch={!isWelcome}         // ❌ Pas de recherche sur Welcome
          showNotifications={showNotifications}  // ❌ Pas de notif sur Welcome & Catalogue
        />
      }
    >
      {children}
    </DashboardShell>
  );
}