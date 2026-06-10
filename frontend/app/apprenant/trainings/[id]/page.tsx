'use client'
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  BookOpen, 
  CheckCircle, 
  Loader2, 
  Calendar, 
  Tag, 
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import { getFormationDetails } from '@/lib/trainings';

export default function TrainingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [training, setTraining] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) loadDetails();
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
      <Loader2 className="animate-spin text-[#1b5333]" size={40} />
      <p className="text-gray-500 font-medium">Chargement...</p>
    </div>
  );

  if (!training) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <BookOpen className="text-gray-300 mx-auto" size={32} />
        <h2 className="text-xl font-bold text-gray-800">Formation introuvable</h2>
        <button 
          onClick={() => router.back()}
          className="text-[#1b5333] font-medium hover:underline"
        >
          Retour
        </button>
      </div>
    </div>
  );

  const sessionCount = training.sessions?.length || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 p-6">
      {/* Breadcrumb */}
      <button 
        onClick={() => router.push('/apprenant/trainings')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1b5333] transition-colors"
      >
        <ArrowLeft size={16} /> Mes formations
      </button>

      {/* Header + Description */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            training.statut === 'completed' 
              ? 'bg-emerald-50 text-emerald-600' 
              : 'bg-amber-50 text-amber-600'
          }`}>
            {training.statut}
          </span>
          {training.categorie && (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 flex items-center gap-1">
              <Tag size={10} /> {training.categorie}
            </span>
          )}
        </div>
        
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{training.title}</h1>
        
        {/* ✅ Description remontée ici, sous le titre */}
        <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">
          {training.description || 'Aucune description disponible.'}
        </p>
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={18} className="text-[#1b5333]" />
            Sessions
          </h3>
          <span className="text-xs text-gray-400 font-medium">{sessionCount} au total</span>
        </div>
        
        <div className="p-5">
          {training.sessions?.length > 0 ? (
            <div className="space-y-3">
              {training.sessions.map((session: any, index: number) => (
                <div 
                  key={session.id} 
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#1b5333] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 text-sm">
                      {session.title || `Session ${index + 1}`}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {session.date 
                          ? new Date(session.date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short'
                            })
                          : 'Date à définir'
                        }
                      </span>
                      {session.formateur && (
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {session.formateur}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase shrink-0">
                    <CheckCircle size={12} />
                    Inscrit
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-8">Aucune session planifiée</p>
          )}
        </div>
      </div>
    </div>
  );
}