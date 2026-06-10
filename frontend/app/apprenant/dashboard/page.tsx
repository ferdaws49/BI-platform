'use client'
import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  Trophy, 
  Calendar, 
  Sparkles,
  ArrowRight,
  Clock,
  Target
} from 'lucide-react';
import { getStudentDashboardData } from '@/lib/student.service';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [userName, setUserName] = useState('Student');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserName(user.username || user.prenom || 'Apprenant'); 
    }
    
    getStudentDashboardData()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b5333]"></div>
    </div>
  );
  
  if (!data) return (
    <div className="p-10 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Sparkles className="text-red-400" size={24} />
      </div>
      <p className="text-red-500 font-medium">Erreur de chargement des données.</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 text-[#1b5333] font-medium hover:underline"
      >
        Réessayer
      </button>
    </div>
  );

  const stats = [
    { 
      label: 'Formations suivies', 
      value: data.stats?.totalEnrolled || '—', 
      subtext: data.stats?.totalEnrolled > 0 ? 'Formations actives' : 'Commencez votre parcours',
      icon: BookOpen, 
      color: 'bg-emerald-50 text-emerald-600',
      empty: !data.stats?.totalEnrolled
    },
    { 
      label: 'Taux de réussite', 
      value: data.stats?.successRate ? `${data.stats.successRate}%` : '—', 
      subtext: data.stats?.successRate ? 'de réussite' : 'Aucun examen passé',
      icon: CheckCircle, 
      color: 'bg-emerald-50 text-emerald-600',
      empty: !data.stats?.successRate
    },
    { 
      label: 'Score moyen', 
      value: data.stats?.average ? data.stats.average : '—', 
      subtext: data.stats?.average ? 'Performance globale' : 'En attente de résultats',
      icon: Trophy, 
      color: 'bg-emerald-50 text-emerald-600',
      empty: !data.stats?.average
    },
    { 
      label: 'Sessions à venir', 
      value: data.stats?.upcomingCount || '—', 
      subtext: data.stats?.upcomingCount > 0 ? 'Total planifié' : 'Aucune session planifiée',
      icon: Calendar, 
      color: 'bg-emerald-50 text-emerald-600',
      empty: !data.stats?.upcomingCount
    },
  ];

  const hasNoData = !data.myTrainings?.length && !data.upcomingSessions?.length && 
                    !data.recentGrades?.length && !data.myRegistrations?.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header simple */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bon retour, {userName} !</h1>
        <p className="text-gray-500 text-sm">
          {hasNoData 
            ? "Bienvenue ! Découvrez nos formations et commencez votre parcours."
            : "Voici un aperçu de votre progression"
          }
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            className={`p-5 rounded-[20px] border flex justify-between items-start transition-all hover:shadow-md ${
              stat.empty 
                ? 'bg-gray-50/50 border-dashed border-gray-200' 
                : 'bg-white border-gray-100'
            }`}
          >
            <div>
              <p className={`text-xs font-medium mb-1 ${stat.empty ? 'text-gray-400' : 'text-gray-500'}`}>
                {stat.label}
              </p>
              <p className={`text-2xl font-bold ${stat.empty ? 'text-gray-300' : 'text-gray-900'}`}>
                {stat.value}
              </p>
              <p className={`text-[10px] mt-1 ${stat.empty ? 'text-gray-300' : 'text-gray-400'}`}>
                {stat.subtext}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${stat.empty ? 'bg-gray-100 text-gray-300' : stat.color}`}>
              <stat.icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Message si aucune donnée */}
      {hasNoData ? (
        <div className="bg-white rounded-[24px] border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="text-emerald-500" size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Votre parcours commence ici</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Vous n'avez pas encore de formations en cours. Explorez notre catalogue et inscrivez-vous à votre première session pour commencer à apprendre.
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => router.push('/apprenant/catalogue')}
              className="bg-[#1b5333] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#154128] transition-all"
            >
              <BookOpen size={16} />
              Voir le catalogue
            </button>
            <button 
              onClick={() => router.push('/apprenant/schedule')}
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-200 transition-all"
            >
              <Clock size={16} />
              Mon planning
            </button>
          </div>
        </div>
      ) : (
        /* Main Content Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Mes formations */}
          <DataSection 
            title="Mes formations" 
            onClick={() => router.push('/apprenant/trainings')}
            hasData={!!data.myTrainings?.length}
          >
            {data.myTrainings?.map((t: any, i: number) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">{t.title}</h3>
                    <p className="text-[11px] text-gray-400 italic">{t.teacher}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                    t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-input text-brand-dark'
                  }`}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </DataSection>

          {/* Sessions à venir */}
          <DataSection 
            title="Sessions à venir" 
            onClick={() => router.push('/apprenant/schedule')}
            hasData={!!data.upcomingSessions?.length}
          >
            {data.upcomingSessions?.map((s: any, i: number) => (
              <div key={i} className="flex gap-4 items-center p-3 rounded-xl border border-gray-50">
                <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg text-center min-w-[50px]">
                  <p className="text-[10px] font-bold uppercase">
                    {new Date(s.date).toLocaleString('fr', { month: 'short' })}
                  </p>
                  <p className="text-lg font-bold leading-none">{new Date(s.date).getDate()}</p>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-800">{s.title}</h3>
                  <p className="text-[11px] text-gray-400">{s.courseTitle}</p>
                </div>
              </div>
            ))}
          </DataSection>

          {/* Résultats récents */}
          <DataSection 
            title="Résultats récents" 
            onClick={() => router.push('/apprenant/results')}
            hasData={true}
          >
            {data.recentGrades?.length ? (
              data.recentGrades.map((r: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-3 border border-gray-50 rounded-xl">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">{r.exam}</h3>
                    <p className="text-[11px] text-gray-400">{r.course}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">{r.score}/{r.max}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      r.status === 'Passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {r.status === 'Passed' ? 'Réussi' : 'Non réussi'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Aucun résultat</p>
            )}
          </DataSection>

          {/* Mes inscriptions */}
          <DataSection 
            title="Mes inscriptions" 
            onClick={() => router.push('/apprenant/registrations')}
            hasData={!!data.myRegistrations?.length}
          >
            {data.myRegistrations?.map((reg: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 border border-gray-50 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{reg.title}</h3>
                  <p className="text-[11px] text-gray-400">
                    {new Date(reg.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                  reg.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 
                  reg.status === 'Completed' ? 'bg-amber-50 text-amber-600' : 
                  'bg-rose-50 text-rose-600'
                }`}>
                  {reg.status}
                </span>
              </div>
            ))}
          </DataSection>

        </div>
      )}
    </div>
  );
}

// ─── Composant section simplifié ───
function DataSection({ 
  title, 
  children, 
  onClick, 
  hasData
}: {
  title: string;
  children: React.ReactNode;
  onClick: () => void;
  hasData: boolean;
}) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[24px] border border-gray-100 overflow-hidden transition-all hover:shadow-md cursor-pointer"
    >
      <div className="p-5 flex justify-between items-center border-b border-gray-50">
        <h2 className="font-bold text-gray-900">{title}</h2>
        <ArrowRight size={16} className="text-gray-400" />
      </div>
      
      <div className="p-5">
        {hasData ? (
          <div className="space-y-4">{children}</div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Aucun résultat</p>
        )}
      </div>
    </div>
  );
}