'use client'
//  C'est lui le "chef d'orchestre" pour l'apprenant. Il appelle le Shell et lui donne la Sidebar de l'apprenant.
import Sidebar from '@/components/apprenant/Sidebar';
import Navbar from '@/components/apprenant/Navbar';
import DashboardShell from '@/components/apprenant/dashboardShared';


export default function ApprenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      sidebar={<Sidebar />}
      navbar={<Navbar />}
    >
      {/* Le contenu des pages (Dashboard, Trainings, etc.) */}
      {children}
    </DashboardShell>
  );
}