'use client'
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, BookOpen, CheckCircle, Loader2, Calendar, Tag } from 'lucide-react';
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
      <Loader2 className="animate-spin text-brand-dark" size={40} />
      <p className="text-gray-500 font-medium">Chargement de votre formation...</p>
    </div>
  );

  if (!training) return <div className="p-10 text-center">Formation introuvable.</div>;

  // Données dérivées de la réponse backend
  const instructor = training.sessions?.[0]?.formateur || 'Centre de Formation';
  const sessionCount = training.sessions?.length || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 p-6">
      {/* Bouton Retour */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-brand-dark transition-colors font-medium text-sm"
      >
        <ArrowLeft size={18} /> Retour à mes formations
      </button>

      {/* Header */}
      <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between gap-8">
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-4 py-1.5 bg-brand-input text-brand-dark rounded-full text-[10px] font-bold uppercase tracking-wider">
              {training.statut}
            </span>
            {training.categorie && (
              <span className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Tag size={10} /> {training.categorie}
              </span>
            )}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{training.title}</h1>
          
          <div className="flex flex-wrap gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <User size={18} className="text-brand-dark" />
              <span className="font-medium">{instructor}</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-brand-dark" />
              <span className="font-medium">{sessionCount} Session{sessionCount > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-brand-dark" />
              <span className="font-medium">
                {training.createdAt ? new Date(training.createdAt).toLocaleDateString() : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne Gauche */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4">À propos de ce cours</h3>
            <p className="text-gray-600 leading-relaxed">{training.description}</p>
          </div>

          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Vos sessions inscrites</h3>
            <div className="space-y-4">
              {training.sessions?.map((session: any, index: number) => (
                <div key={session.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-50 bg-gray-50/30 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 group-hover:text-brand-dark shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-bold text-gray-700 block text-sm">
                        {session.title || `Session ${index + 1}`}
                      </span>
                      <span className="text-xs text-gray-500">
                        {session.date 
                          ? new Date(session.date).toLocaleDateString() 
                          : 'Date à définir'
                        } 
                        {session.formateur ? ` • ${session.formateur}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg text-[10px] font-bold uppercase shrink-0">
                    <CheckCircle size={14} /> Inscrit
                  </div>
                </div>
              ))}
              
              {(!training.sessions || training.sessions.length === 0) && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Aucune session active pour cette formation.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Colonne Droite : Résumé */}
        <div className="space-y-6">
          <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm">
            <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Résumé</h4>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Statut</span>
                <span className="font-medium text-gray-900">{training.statut}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Catégorie</span>
                <span className="font-medium text-gray-900">{training.categorie || '-'}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Sessions</span>
                <span className="font-medium text-gray-900">{sessionCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}