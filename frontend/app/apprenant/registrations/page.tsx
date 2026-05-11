'use client'
import React, { useEffect, useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { getMyRegistrations, cancelInscription } from '@/lib/inscriptions.api';

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Charger l'historique au démarrage
  const loadRegistrations = async () => {
    try {
      const data = await getMyRegistrations();
      setRegistrations(data);
    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  // 2. Gérer l'annulation
  const handleCancel = async (id: string) => {
    if (confirm("Are you sure you want to cancel this registration?")) {
    try {
      const response = await cancelInscription(id);
      
      // On affiche un message de succès (optionnel)
      alert(response.message || "Désinscription réussie");
      
      // ✅ TRÈS IMPORTANT : Recharger la liste pour faire disparaître la ligne
      loadRegistrations(); 
    } catch (error) {
      console.error("Erreur lors de l'annulation:", error);
      alert("Impossible d'annuler l'inscription.");
    }
  }
  };

  // 3. Calculer les statistiques pour les cartes du bas
  const stats = {
    validated: registrations.filter(r => r.status === 'actif' || r.status === 'terminé').length,
    pending: registrations.filter(r => r.status === 'en attente').length,
    rejected: registrations.filter(r => r.status  === 'annulé').length,
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Registrations</h1>
          <p className="text-gray-500">View and manage your training registrations</p>
        </div>
        
        {/* BOUTON POUR S'INSCRIRE (L'action qui manquait) */}
        <button 
          onClick={() => window.location.href = '/apprenant/catalogue'} 
          className="bg-[#1b5333] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#154128] transition-all shadow-lg"
        >
          <Plus size={18} /> New Registration
        </button>
      </div>

      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-gray-300" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-gray-50/50">
                  <th className="px-6 py-4">Training</th>
                  <th className="px-6 py-4">Session</th>
                  <th className="px-6 py-4">Registration Date</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registrations.map((reg) => {
                  const currentStatus = reg.status?.toLowerCase();
                  return(
                    <tr key={reg.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-700">{reg.formation?.title} </td>
                    <td className="px-6 py-4 text-gray-500">{reg.sessionTitle}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(reg.registrationDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-brand-dark">{reg.price} DT</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${
                        currentStatus === 'actif' || currentStatus === 'active' || currentStatus === 'terminé' ? 'bg-emerald-50 text-emerald-600' : 
                        currentStatus === 'annulé' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {reg.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(currentStatus === 'actif' || currentStatus === 'active') ? (
                        <button 
                          onClick={() => handleCancel(reg.id)}
                          className="text-red-400 hover:text-red-600 flex items-center gap-1 ml-auto text-[10px] font-bold"
                        >
                          <X size={14} /> CANCEL
                        </button>

                      ):(
                        <span className="text-[10px] text-gray-300 italic text-right block">No actions</span>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Résumé dynamique basé sur les données du backend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-bold text-emerald-500">{stats.validated}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Validated</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-bold text-orange-500">{stats.pending}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pending</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-bold text-red-500">{stats.rejected}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Rejected / Cancelled</p>
        </div>
      </div>
    </div>
  );
}