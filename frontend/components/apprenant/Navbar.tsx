'use client'
import { useEffect, useState } from 'react';
import { Bell, Search, Loader2 } from 'lucide-react';
import { getProfile } from '@/lib/profile.api'; // Importez votre fonction API

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getProfile();
        setUser(data);
      } catch (error) {
        console.error("Erreur chargement navbar", error);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  // Fonction pour générer les initiales (ex: "Marie Dupont" -> "MD")
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-20 bg-white border-b border-gray-50 flex items-center justify-between px-8 sticky top-0 z-10">
      {/* Barre de recherche */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search trainings, sessions..." 
          className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-brand-dark outline-none text-sm transition-all"
        />
      </div>

      {/* Notifications et Profil */}
      <div className="flex items-center gap-6">
        <button className="relative text-gray-400 hover:text-brand-dark transition-colors">
          <Bell size={22} />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
          {!loading && user ? (
            <>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{user.username}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{user.email}</p>
              </div>
              
              {/* Image ou Initiales */}
              {/**ken yabda andou image yhottha makench yhotlou  les premiers lettres de son nom */}
              {user.profileImage ? (
                <img 
                  src={`http://localhost:5000/profile/images/${user.profileImage}`} 
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover shadow-inner border border-gray-100"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center font-bold text-sm shadow-inner">
                  {getInitials(user.username)}
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