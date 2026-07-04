'use client'
import React, { useCallback, useEffect, useState } from 'react';
import { X, Plus, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getMyRegistrations, cancelInscription } from '@/lib/inscriptions.api';


type ToastType = 'success' | 'error';

function Toast({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-xl px-5 py-3 shadow-lg border transition-all ${
      isSuccess 
        ? 'bg-emerald-600 border-emerald-500' 
        : 'bg-red-600 border-red-500'
    }`}>
      {isSuccess 
        ? <CheckCircle size={18} className="text-white shrink-0" />
        : <X size={18} className="text-white shrink-0" />
      }
      <span className="text-sm font-medium text-white">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/70 hover:text-white text-xs">✕</button>
    </div>
  );
}

// ── Modale de confirmation ─────────────────────────────────
function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <X size={22} className="text-red-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Annuler l'inscription ?</h3>
          <p className="text-sm text-gray-500">
            Cette action est irréversible. Votre place dans la session sera libérée.
          </p>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
          >
            Retour
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all"
          >
            Oui, annuler
          </button>
        </div>
      </div>
    </div>
  );
}
export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);

  const closeToast = useCallback(() => setToast(null), []);


  // 1. Charger l'historique
  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const data = await getMyRegistrations();
      setRegistrations(data);
    } catch (error) {
      console.error("Erreur chargement:", error);
       showToast("Erreur lors du chargement des inscriptions.", 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const [confirmId, setConfirmId] = useState<string | null>(null);

  // 2. Gérer l'annulation
  const handleCancel = async (id: string) => {
  // Plus de confirm() — on ouvre la modale
  setConfirmId(id);
};

const handleConfirmCancel = async () => {
  if (!confirmId) return;
  setConfirmId(null);
  try {
    const response = await cancelInscription(confirmId);
    setRegistrations(prev =>
      prev.map(reg =>
        String(reg.id) === String(confirmId)
          ? { ...reg, status: 'annulé' }
          : reg
      )
    );
    showToast(response.message || "Inscription annulée avec succès.", 'success');
  
  } catch (error: any) {
    showToast(error.message || "Impossible d'annuler l'inscription.", 'error');
  }
};
 

  const isSessionUpcoming = (sessionDate: string | Date | null) => {
    if (!sessionDate) return true; // Si pas de date, on autorise par défaut
    return new Date(sessionDate) > new Date();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      {confirmId && (
  <ConfirmModal
    onConfirm={handleConfirmCancel}
    onCancel={() => setConfirmId(null)}
  />
)}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes inscriptions</h1>
          <p className="text-gray-500">Voir et gérer vos inscriptions aux formations</p>
        </div>
        
        <button 
          onClick={() => router.push('/apprenant/catalogue')} 
          className="bg-[#1b5333] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#154128] transition-all shadow-lg"
        >
          <Plus size={18} /> Nouvelle inscription
        </button>
      </div>

     

      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-gray-300" size={40} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-gray-50/50">
                  <th className="px-6 py-4">Formation</th>
                  <th className="px-6 py-4">Session</th>
                  <th className="px-6 py-4">Prix</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registrations.map((reg) => {
                  const currentStatus = reg.status?.toLowerCase();
                  const canCancel = 
                    (currentStatus === 'actif' || currentStatus === 'active') && 
                    isSessionUpcoming(reg.sessionDate);
                  return (
                    <tr key={reg.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-700">{reg.formation?.title}</td>
                      <td className="px-6 py-4 text-gray-500">{reg.sessionTitle}</td>
                      <td className="px-6 py-4 font-medium text-brand-dark">
                        {reg.price != null ? `${reg.price} DT` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${
                          currentStatus === 'actif' || currentStatus === 'active' || currentStatus === 'terminé' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : currentStatus === 'annulé' 
                            ? 'bg-red-50 text-red-600' 
                            : 'bg-orange-50 text-orange-600'
                        }`}>
                          {reg.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {reg.status?.toLowerCase() === 'cancelled' ? (
                          <span className="text-[10px] font-bold text-red-400 uppercase block text-right">
                            Session annulée
                            </span>
                            ) : (reg.status?.toLowerCase() === 'actif' || reg.status?.toLowerCase() === 'active') && isSessionUpcoming(reg.sessionDate) ? (
                            <button 
                            onClick={() => handleCancel(String(reg.id))}
                            className="text-red-400 hover:text-red-600 flex items-center gap-1 ml-auto text-[10px] font-bold"
                            >
                              <X size={14} /> ANNULER
                              </button>
                              ) : (
                              <span className="text-[10px] text-gray-300 italic text-right block">
                                Aucune action
                                </span>
                              )}
                              </td>
                              </tr>
                              );
                              })}
                              {registrations.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                                    Aucune inscription trouvée. Cliquez sur "Nouvelle inscription" pour commencer.
                                    </td>
                                    </tr>
                                  )}
                                  </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}