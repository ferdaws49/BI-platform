'use client'
import React, { useEffect, useState } from 'react';
import { Search, Clock, BookOpen, ChevronRight, ChevronLeft } from 'lucide-react';
import { getMyFormations } from '@/lib/trainings';
import { useRouter } from 'next/navigation';

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États pour le filtre et la pagination
  const [statusFilter, setStatusFilter] = useState(''); // "" signifie "All Status"
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const router = useRouter();

  // On recharge quand le filtre OU la page change
  useEffect(() => {
    loadTrainings();
  }, [statusFilter, currentPage]);

  const loadTrainings = async () => {
    setLoading(true);
  try {
    const res = await getMyFormations(statusFilter, currentPage);
    
    // ✅ On vérifie si res existe ET si res.meta existe
    if (res && res.meta) {
      setTrainings(res.data);
      setTotalPages(res.meta.totalPages || 1);
    } else {
      setTrainings([]); // Liste vide si erreur
      setTotalPages(1);
    }
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
  };

  // Quand on change le filtre, on doit revenir à la page 1
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1); 
  };

  return (
    <div className="space-y-8 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Trainings</h1>
        <p className="text-gray-500">View and manage your enrolled programs</p>
      </div>

      {/* FILTRES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search trainings..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#1b5333] outline-none" 
          />
        </div>

        <select 
          value={statusFilter}
          onChange={handleFilterChange}
          className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#1b5333] cursor-pointer outline-none"
        >
          <option value="">All Status</option>
          <option value="active">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400 font-medium">Loading trainings...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainings?.map((training) => (
              <div key={training.id} className="bg-white rounded-[24px] border border-gray-100 shadow-sm flex flex-col group hover:shadow-md transition-all">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-gray-800 leading-snug">{training.title}</h3>
                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                      training.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-input text-brand-dark'
                    }`}>
                      {training.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-6 italic">{training.instructor}</p>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-6">
                    <Clock size={14} className="text-[#1b5333]" /> {training.duration}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                      <span>Progress</span>
                      <span>{training.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1b5333] transition-all duration-500" style={{ width: `${training.progress}%` }} />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => router.push(`/apprenant/trainings/${training.id}`)}
                  className="w-full py-4 border-t border-gray-50 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen size={14} /> View Details <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* PAGINATION UI */}
          <div className="flex items-center justify-center gap-4 pt-8">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 rounded-xl border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            
            <span className="text-sm font-bold text-gray-600">
              Page {currentPage} sur {totalPages}
            </span>

            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 rounded-xl border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}