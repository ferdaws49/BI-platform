'use client'
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';

export default function DetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
   const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id || id === 'undefined') return;
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:5000/results/formation/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Failed to fetch");
        
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Erreur lors du chargement des détails:", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetails();
  }, [id]);

  if (!id || loading) return (
    <div className="flex justify-center p-20">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  if (!data) return <div className="p-10 text-center">No data found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      {/* Bouton Retour */}
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase hover:text-brand-dark transition-colors"
      >
          <ArrowLeft size={14} /> Retour aux résultats
      </button>

      {/* Header avec la moyenne de la formation */}
      <div className="bg-[#1b5333] text-white p-10 rounded-[32px] flex justify-between items-center shadow-lg">
        <div>
          <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-2">Formation</p>
          <h1 className="text-3xl font-bold">{data.formationTitle}</h1>
        </div>
        <div className="text-right">
          <p className="text-5xl font-black">{data.average}<span className="text-xl opacity-50">/20</span></p>
          <p className="text-xs font-bold uppercase mt-2">Moyenne générale</p>
        </div>
      </div>

      {/* Liste des notes par session */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        {/* ✅ LIAISON : On utilise 'data.sessions' car c'est le nom envoyé par le back */}
        {data.sessions && data.sessions.length > 0 ? (
          data.sessions.map((item: any) => {
            // Calcul du statut à la volée
            const status = item.note >= 10 ? 'Réussi' : 'Échoué';
            
            return (
              <div key={item.sessionId} className="p-6 flex justify-between items-center border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl text-gray-400">
                    <FileText size={20} />
                  </div>
                  <div>
                    {/* On affiche Formation + ID de session ou Titre si dispo */}
                    <p className="font-bold text-gray-700">Session d'évaluation</p>
                    <p className="text-[10px] text-gray-400">
                      {item.date ? new Date(item.date).toLocaleDateString('en-GB') : 'Pas de date'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    {/* ✅ LIAISON : On utilise 'item.note' (nom du back) */}
                    <p className="text-lg font-bold text-gray-900">{item.note} <span className="text-xs text-gray-400">/ 20</span></p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      status === 'Réussi' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-10 text-center text-gray-400 italic">Aucune session détaillée trouvée.</div>
        )}
      </div>
    </div>
  );
}