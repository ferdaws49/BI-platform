'use client'
import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  Trophy, 
  Calendar, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { getStudentDashboardData } from '@/lib/student.service';
import { useRouter } from 'next/navigation';



export default function Dashboard() {

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  //pour l'affichage du non du user
  const [userName, setUserName] = useState('Student');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // Utilisez 'firstName' ou 'name' selon le champ de votre base de données
      setUserName(user.username); 
    };
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

  if (loading) return <div className="p-10 text-center">Chargement du tableau de bord...</div>;
  if (!data) return <div className="p-10 text-center text-red-500">Erreur de chargement des données.</div>;

  // Mapping des stats du backend vers votre design
  const stats = [
    { label: 'Formations suivies', value: data.stats.totalEnrolled, subtext: 'Formations actives', icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Taux de réussite', value: `${data.stats.successRate ?? 0}%`, subtext: 'de réussite', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Score moyen', value: data.stats.average, subtext: 'Performance globale', icon: Trophy, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Sessions à venir', value: data.stats.upcomingCount, subtext: 'Total planifié', icon: Calendar, color: 'bg-emerald-50 text-emerald-600' },
  ];



  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Bon retour, {userName} !</h1>
        <p className="text-gray-500 text-sm">Voici un aperçu de votre progression</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-[20px] border border-gray-100 flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-brand-dark">{stat.value}</p>
              <p className="text-[10px] text-gray-400 mt-1">{stat.subtext}</p>
            </div>
            <div className={`p-2 rounded-lg ${stat.color}`}>
              <stat.icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Mes formations */}
        <div onClick={() => router.push('/apprenant/trainings')}
         className="bg-white rounded-[24px] border border-gray-100 overflow-hidden">
  <div className="p-5 flex justify-between items-center border-b border-gray-50">
    <h2 className="font-bold text-brand-dark">Mes formations</h2>
  </div>
  <div className="p-5 space-y-6">
    {data.myTrainings?.map((t: any, i: number) => (
      <div key={i} className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-bold text-gray-800">{t.title}</h3>
            <p className="text-[11px] text-gray-400 italic">{t.teacher}</p>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-input text-brand-dark'}`}>
            {t.status}
          </span>
        </div>
        
      </div>
    ))}
  </div>
</div>

        {/* Sessions à venir */}
        <div onClick={() => router.push('/apprenant/schedule')}
        className="bg-white rounded-[24px] border border-gray-100 overflow-hidden">
          <div className="p-5 flex justify-between items-center border-b border-gray-50">
            <h2 className="font-bold text-brand-dark">Sessions à venir</h2>
          </div>
          <div className="p-5 space-y-4">
            {data.upcomingSessions?.map((s: any, i: number) => (
              <div key={i} className="flex gap-4 items-center p-3 rounded-xl border border-gray-50">
                <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg text-center min-w-[50px]">
                   {/* Formatage de la date (ex: Mar 08) */}
                  <p className="text-[10px] font-bold uppercase">{new Date(s.date).toLocaleString('en', { month: 'short' })}</p>
                  <p className="text-lg font-bold leading-none">{new Date(s.date).getDate()}</p>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-800">{s.title}</h3>
                  <p className="text-[11px] text-gray-400">{s.courseTitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Résultats récents */}
        <div  onClick={() => router.push('/apprenant/results')}
        className="bg-white rounded-[24px] border border-gray-100 overflow-hidden">
          <div className="p-5 flex justify-between items-center border-b border-gray-50">
            <h2 className="font-bold text-brand-dark">Résultats récents</h2>
          </div>
          <div className="p-5 space-y-4">
            {data.recentGrades?.map((r: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 border border-gray-50 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{r.exam}</h3>
                  <p className="text-[11px] text-gray-400">{r.course}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-brand-dark">{r.score}/{r.max}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded  ${r.status === 'Passed' ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'}`}>
                    {r.status ? 'Réussi' : 'Non réussi'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mes inscriptions */}
        <div  onClick={() => router.push('/apprenant/registrations')}
        className="bg-white rounded-[24px] border border-gray-100 overflow-hidden">
          <div className="p-5 flex justify-between items-center border-b border-gray-50">
            <h2 className="font-bold text-brand-dark">Mes inscriptions</h2>
          </div>
          <div className="p-5 space-y-4">
            {data.myRegistrations?.map((reg: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 border border-gray-50 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{reg.title}</h3>
                  <p className="text-[11px] text-gray-400">
                    {new Date(reg.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase 
                ${reg.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 
                  reg.status === 'Completed' ? 'bg-amber-50 text-amber-600' : 
                  'bg-rose-50 text-rose-600'}`}>
                    {reg.status}
                    </span>
                    </div>
                  ))}
                  </div>
                  </div>

      </div>
    </div>
  );
}