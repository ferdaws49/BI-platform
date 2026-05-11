'use client'
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, User, BookOpen, ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import { getFormationDetails } from '@/lib/trainings';

export default function TrainingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [training, setTraining] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadDetails();
    }
  }, [params.id]);

  const loadDetails = async () => {
    try {
      const data = await getFormationDetails(Number(params.id));
      setTraining(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="animate-spin text-brand-dark" size={40} />
      <p className="text-gray-500 font-medium">Chargement de votre formation...</p>
    </div>
  );

  if (!training) return <div className="p-10 text-center">Formation introuvable.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Bouton Retour */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-brand-dark transition-colors font-medium text-sm"
      >
        <ArrowLeft size={18} /> Retour à mes formations
      </button>

      {/* Header de la formation */}
      <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between gap-8">
        <div className="space-y-4 flex-1">
          <span className="px-4 py-1.5 bg-brand-input text-brand-dark rounded-full text-[10px] font-bold uppercase tracking-wider">
            {training.status}
          </span>
          <h1 className="text-4xl font-bold text-gray-900">{training.title}</h1>
          <div className="flex flex-wrap gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <User size={18} className="text-brand-dark" />
              <span className="font-medium">{training.instructor}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-brand-dark" />
              <span className="font-medium">{training.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-brand-dark" />
              <span className="font-medium">{training.chapters?.length} Chapitres</span>
            </div>
          </div>
        </div>

        <div className="md:w-64 bg-gray-50 rounded-2xl p-6 flex flex-col justify-center items-center text-center border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Votre Progression</p>
          <div className="text-4xl font-black text-brand-dark mb-4">{training.progress}%</div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand-dark transition-all duration-1000" style={{ width: `${training.progress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne Gauche: Description et Contenu */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4">À propos de ce cours</h3>
            <p className="text-gray-600 leading-relaxed">{training.description}</p>
          </div>

          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Programme de la formation</h3>
            <div className="space-y-4">
              {training.chapters?.map((chapter: any, index: number) => (
                <div key={chapter.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-50 bg-gray-50/30 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 group-hover:text-brand-dark">
                      {index + 1}
                    </span>
                    <span className="font-bold text-gray-700">{chapter.title}</span>
                  </div>
                  {chapter.status === 'completed' ? (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg text-[10px] font-bold uppercase">
                      <CheckCircle size={14} /> Terminé
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-lg uppercase">
                      En attente
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne Droite: Actions */}
       
      </div>
    </div>
  );
}