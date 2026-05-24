
'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, BookOpen, ClipboardList, 
  BarChart3, Calendar, User, LogOut, 
  DollarSign
} from 'lucide-react';

import { useRouter } from 'next/navigation';

const navItems = [
  { name: 'Tableau de bord', href: '/apprenant/dashboard', icon: LayoutDashboard },
  { name: 'Mes formations', href: '/apprenant/trainings', icon: BookOpen },
  { name: 'Mes inscriptions', href: '/apprenant/registrations', icon: ClipboardList },
  { name: 'Mes résultats', href: '/apprenant/results', icon: BarChart3 },
  { name: 'Planning des sessions', href: '/apprenant/schedule', icon: Calendar },
  { name: 'Mes paiements', href: '/apprenant/paiement', icon: DollarSign },
  { name: 'Mon profil', href: '/apprenant/profile', icon: User },

];



export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    // 1. Supprimer le token et les infos utilisateur
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event("auth-state-changed"));

    // 2. Rediriger vers la page de connexion
    router.push('/auth/login');
    
    // Optionnel : Forcer un rafraîchissement pour vider tous les états React
    // window.location.href = '/login'; 
  };

  return (
    <div className="flex flex-col h-full">
      {/* LOGO */}
      <div className="p-8 flex items-center gap-3">
        <div className="bg-[#2d4a3e] p-2 rounded-lg text-white">
          <BookOpen size={20} />
        </div>
        <span className="font-bold text-xl text-[#2d4a3e] italic tracking-tight">BI Training Center</span>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-4 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                isActive 
                ? 'bg-[#2d4a3e] text-white shadow-lg shadow-[#2d4a3e]/20' 
                : 'text-gray-400 hover:bg-[#efefea] hover:text-[#2d4a3e]'
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <div className="p-6 border-t border-gray-50">
        <button onClick={handleLogout}
         className="flex items-center gap-3 px-4 py-3 w-full text-sm font-bold text-red-400 hover:bg-red-50 rounded-xl transition-all">
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </div>
  );
}
