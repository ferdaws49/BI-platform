'use client'
import React, { useEffect, useState } from 'react';
import { Trophy, ChevronRight, Loader2, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ResultsPage() {
  const [formationsSummary, setFormationsSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        
        const res = await fetch('http://localhost:5000/results/summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();

        if (data && data.results) {
          setFormationsSummary(data.results);
        } else if (Array.isArray(data)) {
          setFormationsSummary(data);
        }
      } catch (err) {
        console.error("Erreur liaison résultats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return (
    <div className="flex justify-center p-20">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Mes résultats</h1>
      
      <div className="space-y-4 w-full">
        {formationsSummary.length === 0 ? (
          /* ← BLOC "AUCUN RÉSULTAT" */
          <div className="w-full bg-white p-12 rounded-[32px] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="p-6 bg-gray-50 rounded-full mb-4">
              <ClipboardList size={40} className="text-gray-300" />
            </div>
            <h3 className="text-gray-900 font-bold italic">
              Aucun résultat pour le moment
            </h3>
            <p className="text-sm text-gray-400 max-w-md">
              Vous n'avez pas encore de formations évaluées. Revenez plus tard pour consulter vos performances.
            </p>
          </div>
        ) : (
          /* ← LISTE DES RÉSULTATS (votre code existant) */
          
          formationsSummary.map((f) => (
            <div 
              key={f.id || f.formationId} 
              //{/*onClick={() => router.push(`/apprenant/results/${f.id || f.formationId}`)}*/}
              className="w-full bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
      <div className="p-5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-[#1b5333] group-hover:text-white transition-colors">
        <Trophy size={24} />
      </div>
      <div>
        <h3 className="font-bold text-gray-800 text-lg">{f.name}</h3>
        
        {/* STATUT AJOUTÉ */}
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            f.isPassed 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {f.isPassed ? 'Réussi' : 'Non réussi'}
          </span>
          
        </div>
      </div>
    </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-3xl font-black text-gray-900 leading-none">
                    {f.average}<span className="text-sm text-gray-400 ml-1">/20</span>
                  </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Moyenne</p>
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-[#1b5333] transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}