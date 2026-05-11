'use client'
import React, { useEffect, useState } from 'react';
import { Trophy, ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ResultsPage() {
  const [formationsSummary, setFormationsSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        // ✅ Correction : vérifie si tu utilises 'token' ou 'access_token'
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        
        const res = await fetch('http://localhost:5000/results/summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();

        // ✅ LIAISON : Le backend renvoie { overallAverage: ..., results: [...] }
        // On doit donc prendre 'data.results'
        if (data && data.results) {
          setFormationsSummary(data.results);
        } else if (Array.isArray(data)) {
          // Au cas où ton backend renvoie directement le tableau
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

  if (loading) return (<div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">My Results</h1>
      <div className="space-y-4 w-full">
  {formationsSummary.map((f) => (
    <div 
      key={f.id  || f.formationId } 
      onClick={() => router.push(`/apprenant/results/${f.id || f.formationId}`)}
      // w-full : occupe toute la largeur
      // flex justify-between : pousse les éléments aux extrémités
      className="w-full bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md transition-all group"
    >
      {/* BLOC GAUCHE */}
      <div className="flex items-center gap-4">
        <div className="p-5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-[#1b5333] group-hover:text-white transition-colors">
          <Trophy size={24} />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-lg">{f.name  || f.formationTitle}</h3>
          <p className="text-xs text-gray-400">{f.count} evaluations completed</p>
        </div>
      </div>

      {/* BLOC DROITE */}
      <div className="flex items-center gap-8">
        <div className="text-right">
          <p className="text-3xl font-black text-gray-900 leading-none">
            {f.average}<span className="text-sm text-gray-400 ml-1">/20</span>
          </p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Average</p>
        </div>
        <ChevronRight className="text-gray-300 group-hover:text-[#1b5333] transition-colors" />
      </div>
    </div>
  ))}
</div>
    </div>
  );
}