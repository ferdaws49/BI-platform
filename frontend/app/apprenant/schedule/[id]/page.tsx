'use client'
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getFormationSchedules } from '@/lib/schedules.api';
import { Clock, Calendar, CheckCircle } from 'lucide-react';

export default function FormationSchedulePage() {
  const { id } = useParams(); // Récupère l'ID depuis l'URL /formations/123/schedule
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && id !== 'undefined') {
      setLoading(true);
      getFormationSchedules(Number(id))
        .then(setSessions)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <p>Chargement du planning du cours...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Programme de la formation</h1>
        <p className="text-gray-500">Liste complète des séances et horaires</p>
      </header>

      <div className="relative border-l-2 border-emerald-100 ml-4 space-y-8">
        {sessions.map((session: any, index: number) => (
          <div key={index} className="relative pl-8">
            
            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
            
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{session.formationTitle}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} /> {new Date(session.startISO).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> {session.start} - {session.end}
                    </span>
                  </div>
                </div>
                
                <button className="text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg">
                  Voir les ressources
                </button>
              </div>
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="pl-8 text-gray-400 italic">
            Aucune séance n'est encore programmée pour cette formation.
          </div>
        )}
      </div>
    </div>
  );
}
