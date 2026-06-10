'use client'
import { useEffect, useState } from 'react';
import { Bell, Search, Loader2 } from 'lucide-react';
import { getProfile } from '@/lib/profile.api';

interface NavbarProps {
  showSearch?: boolean;
  showNotifications?: boolean;
}

export default function Navbar({ showSearch = true, showNotifications = true }: NavbarProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getProfile();
        console.log("Navbar user:", data); // Debug
        setUser(data);
      } catch (error) {
        console.error("Erreur chargement navbar", error);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const getInitials = (userData: any): string => {
    if (!userData) return '?';
    const nom = userData.nom || '';
    const prenom = userData.prenom || '';
    const n = typeof nom === 'string' ? nom.trim().charAt(0) : '';
    const p = typeof prenom === 'string' ? prenom.trim().charAt(0) : '';
    const result = (n + p).toUpperCase();
    if (!result && userData.username) {
      return userData.username.toString().substring(0, 2).toUpperCase();
    }
    if (!result && userData.email) {
      return userData.email.toString().substring(0, 2).toUpperCase();
    }
    return result || '?';
  };

  return (
    <header className="h-20 bg-white border-b border-gray-50 flex items-center justify-between px-8 sticky top-0 z-10">
      {/* Barre de recherche */}
      {showSearch ? (
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher formations, sessions..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-brand-dark outline-none text-sm transition-all"
          />
        </div>
      ) : (
        <div />
      )}

      {/* Notifications et Profil */}
      <div className="flex items-center gap-6">
        {/* ✅ Icône notification - conditionnée par showNotifications */}
        {showNotifications && (
          <button className="relative text-gray-400 hover:text-[#1b5333] transition-colors">
            <Bell size={22} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        )}
        
        <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
          {!loading && user ? (
            <>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{user.username || ''}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{user.email || ''}</p>
              </div>
              
              {user.profileImage ? (
                <img 
                  src={`http://localhost:5000/profile/images/${user.profileImage}`} 
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover shadow-inner border border-gray-100"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#1b5333] text-white flex items-center justify-center font-bold text-sm shadow-inner">
                  {getInitials(user)}
                </div>
              )}
            </>
          ) : (
            <Loader2 className="animate-spin text-gray-300" size={20} />
          )}
        </div>
      </div>
    </header>
  );
}