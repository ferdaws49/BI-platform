'use client'
import React, { useEffect, useState } from 'react';
import { BookPlus, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CataloguePage() {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const router = useRouter();

  // 1. Charger les formations disponibles
  useEffect(() => {
    const fetchCatalogue = async () => {
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('http://localhost:5000/student/formations/catalogue', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      if (res.ok) {
      const data = await res.json();
       console.log("Données reçues :", data); 
      setFormations(data);
    }
  }
  catch (error) {
        console.error("Erreur chargement catalogue", error);
      } finally {
        setLoading(false);
      }
      
    };
    fetchCatalogue();
  }, []);

  // 2. Fonction pour s'inscrire
  const handleEnroll = async (formationId: number) => {
    setSubmitting(formationId);
    const token = localStorage.getItem('access_token');
    
    try {

      // Étape A : On doit d'abord récupérer une session disponible pour cette formation
    const sessionRes = await fetch(`http://localhost:5000/student/formations/${formationId}/available-sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const sessions = await sessionRes.json();

    if (!Array.isArray(sessions) || sessions.length === 0) {
          alert("Désolé, aucune session n'est disponible (vérifiez le statut Actif ou la capacité).");
          return;
      }
    const targetSessionId = sessions[0].id;

      const res = await fetch('http://localhost:5000/inscriptions', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({  sessionId: targetSessionId, formationId: Number(formationId)  })
      });

      if (res.ok) {
        // Rediriger vers la page des inscriptions pour voir le statut "Pending"
        router.push('/apprenant/registrations?success=true');
      }else{
        const errorData = await res.json();
        console.error("Erreur du serveur :", errorData);
        alert(`Erreur : ${errorData.message || "Impossible de s'inscrire"}`);
      }
    } catch (error) {
      alert("Erreur lors de l'inscription");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-6">
      {/* Header avec bouton retour */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Catalogue</h1>
          <p className="text-gray-500">Explore and enroll in our available programs</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formations.map((f: any) => (
            <div key={f.id} className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-3">{f.title}</h3>
                <p className="text-sm text-gray-500 mb-6 line-clamp-3 leading-relaxed">{f.description}</p>
                
                <div className="flex flex-wrap gap-3 mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg">
                    {f.duration}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-500 px-3 py-1 rounded-lg">
                    {f.instructor}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => handleEnroll(f.id)}
                disabled={submitting === f.id}
                className="w-full py-4 bg-[#1b5333] hover:bg-[#154128] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {submitting === f.id ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <BookPlus size={18} /> Enroll Now
                  </>
                )}
              </button>
            </div>
          ))}

          {formations.length === 0 && (
            <div className="col-span-full text-center py-20 bg-gray-50 rounded-[32px]">
               <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4" />
               <p className="text-gray-500 font-medium">You are already enrolled in all our available programs!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}