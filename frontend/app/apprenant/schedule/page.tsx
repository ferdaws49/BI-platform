'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar as CalendarIcon, Clock, MapPin, Video, LayoutList, 
  ChevronRight, ChevronLeft, Loader2, AlertCircle 
} from 'lucide-react'
import { 
  format, addMonths, subMonths, addWeeks, subWeeks,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameDay, parseISO, getDay
} from 'date-fns'
import { getStudentSchedules, joinOnlineSession } from '@/lib/schedules.api'
import { useRouter } from 'next/navigation'

interface Schedule {
  id: number;
  formationId: number;
  title: string;
  date: string;
  start: string;
  end: string;
  startISO: string;
  room: string;
  type: 'Online' | 'In-Person' | 'en_ligne' | 'présentiel';
  courseName: string;
  color: string;
}

export default function SchedulePage() {
  // --- ÉTATS ---
  const [filterType, setFilterType] = useState<'week' | 'month'>('week'); // Choix Semaine ou Mois
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // --- CALCUL DES DATES POUR LE BACKEND ---
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
      
        const dateParam = format(currentDate, 'yyyy-MM-dd');
        const data = await getStudentSchedules(filterType, dateParam);
        setSchedules(data);
      } catch (err) {
        setError("Erreur de connexion avec le serveur.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentDate, filterType]);

  // --- NAVIGATION ---
  const handleNext = () => {
    filterType === 'month' ? setCurrentDate(addMonths(currentDate, 1)) : setCurrentDate(addWeeks(currentDate, 1));
  };

  const handlePrev = () => {
    filterType === 'month' ? setCurrentDate(subMonths(currentDate, 1)) : setCurrentDate(subWeeks(currentDate, 1));
  };

  return (
    <div className="space-y-8 p-4 md:p-8 bg-[#f9f8f3] min-h-screen">
      
      {/* HEADER & FILTRES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mon Emploi du Temps</h1>
          <p className="text-gray-500 font-medium">Planning des cours et sessions</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* SÉLECTEUR SEMAINE / MOIS */}
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            <button 
              onClick={() => setFilterType('week')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'week' ? 'bg-[#2d4a3e] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Semaine
            </button>
            <button 
              onClick={() => setFilterType('month')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'month' ? 'bg-[#2d4a3e] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Mois
            </button>
          </div>

          {/* NAVIGATION PRÉCÉDENT / SUIVANT */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
            <button onClick={handlePrev} className="p-1 hover:text-emerald-600"><ChevronLeft size={20}/></button>
            <span className="text-sm font-bold min-w-[140px] text-center">
              {filterType === 'month' 
                ? format(currentDate, 'MMMM yyyy') 
                : `Semaine du ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd MMM')}`}
            </span>
            <button onClick={handleNext} className="p-1 hover:text-emerald-600"><ChevronRight size={20}/></button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={40}/></div>
      ) : (
        <div className="animate-in fade-in duration-500">
          {filterType === 'week' ? (
            /* --- VUE SEMAINE (LISTE DÉTAILLÉE) --- */
            <div className="space-y-6">
              {schedules.length === 0 ? (
                <EmptyState />
              ) : (
                schedules.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))
              )}
            </div>
          ) : (
            /* --- VUE MOIS (GRILLE CALENDRIER) --- */
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
               <div className="grid grid-cols-7 border-b border-gray-100">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                    <div key={d} className="py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{d}</div>
                  ))}
               </div>
               <div className="grid grid-cols-7">
                  {renderCalendarGrid(currentDate, schedules)}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --- SOUS-COMPOSANTS ---

function SessionCard({ session }: { session: any}) {
  const router = useRouter();
  const [joining, setJoining] = useState(false); // État de chargement du bouton



    const isOnline = session.type === 'en_ligne' || session.type === 'Online';
  const displayType = isOnline ? 'En ligne' : 'Présentiel';

  const handleJoin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // ⛔ Empêche la carte de naviguer vers le détail formation
    
    try {
      setJoining(true);
      const data = await joinOnlineSession(session.id);
      if (data.joinUrl) {
        window.open(data.joinUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert('Impossible de rejoindre : session non active, date incorrecte ou vous n\'êtes pas inscrit.');
    } finally {
      setJoining(false);
    }

  }; 
  {/**onClick={() => router.push(`/apprenant/schedule/${session.formationId}`)} hedi kenet fi awel div */}
  return (
    <div 
     className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition-all group">
      <div className="flex md:flex-col items-center justify-center bg-[#f9f8f3] rounded-2xl p-4 min-w-[90px] group-hover:bg-emerald-50 transition-colors">
        <span className="text-2xl font-black text-[#2d4a3e]">{format(parseISO(session.date), 'dd')}</span>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{format(parseISO(session.date), 'EEEE')}</span>
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">{session.sessionName}</span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${(session.type === 'Online' || session.type === 'en_ligne') ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
            {displayType}
          </span>
        </div>
        <h3 className="text-lg font-bold text-gray-800">{session.courseName}</h3>
        <div className="flex flex-wrap gap-4 mt-3 text-gray-500 text-xs font-medium">
          <div className="flex items-center gap-1.5"><Clock size={14} className="text-emerald-700"/> {session.start} - {session.end}</div>
          <div className="flex items-center gap-1.5"><MapPin size={14} className="text-emerald-700"/> {session.room}</div>
        </div>
      </div>

      <div className="flex items-center">
        {isOnline && (
          <button 
            onClick={handleJoin}
            disabled={joining}
            className="w-full md:w-auto bg-[#2d4a3e] text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Video size={16} /> 
            {joining ? 'Ouverture...' : 'Rejoindre le cours'}
          </button>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white p-20 rounded-[32px] border-2 border-dashed border-gray-100 text-center">
      <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
        <CalendarIcon size={30} />
      </div>
      <h3 className="text-gray-900 font-bold italic">Aucune session prévue</h3>
      <p className="text-gray-400 text-sm">Profitez-en pour réviser vos anciens cours !</p>
    </div>
  )
}

// --- LOGIQUE DU CALENDRIER MOIS ---
function renderCalendarGrid(currentDate: Date, schedules: Schedule[]) {
  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const firstDayOfMonth = getDay(start); // 0 = Dimanche
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Ajustement pour Lundi
  
  const days = eachDayOfInterval({ start, end });
  const cells = [];

  // Cases vides
  for (let i = 0; i < startOffset; i++) {
    cells.push(<div key={`empty-${i}`} className="min-h-[110px] bg-gray-50/20 border-r border-b border-gray-50" />);
  }

  // Jours du mois
  days.forEach(day => {
    const daySessions = schedules.filter(s => isSameDay(parseISO(s.date), day));
    const isToday = isSameDay(day, new Date());

    cells.push(
      <div key={day.toString()} className="min-h-[110px] p-2 border-r border-b border-gray-50 hover:bg-[#f9f8f3] transition-colors">
        <span className={`text-xs font-black ${isToday ? 'bg-[#2d4a3e] text-white w-6 h-6 flex items-center justify-center rounded-full shadow-lg' : 'text-gray-300'}`}>
          {format(day, 'd')}
        </span>
        <div className="mt-2 space-y-1">
          {daySessions.map(s => (
            <div 
              key={s.id} 
              style={{ backgroundColor: s.color }} 
              className="text-[9px] font-bold p-1 rounded border border-black/5 truncate text-emerald-900 shadow-sm" 
            >
              {s.start} {s.courseName}
            </div>
          ))}
        </div>
      </div>
    );
  });

  return cells;
}