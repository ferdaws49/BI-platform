'use client'

import { StarRating } from '@/components/apprenant/StarRating';
import { ReviewModal } from '@/components/apprenant/ReviewModal';
import React, { useEffect, useState } from 'react';
import { Search, Clock, BookOpen, ChevronRight, ChevronLeft, Star } from 'lucide-react';
import { getMyFormations, rateFormation } from '@/lib/trainings';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner'; // ✅ AJOUT ICI

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const router = useRouter();

  useEffect(() => {
    loadTrainings();
  }, [statusFilter, currentPage]);

  const loadTrainings = async () => {
    setLoading(true);
    try {
      const res = await getMyFormations(statusFilter, currentPage);
      if (res && res.meta) {
        setTrainings(res.data);
        setTotalPages(res.meta.totalPages || 1);
      } else {
        setTrainings([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleRate = async (formationId: number, note: number) => {
    try {
      await rateFormation(formationId, note);
      loadTrainings();
      toast.success("Merci pour votre note !"); // ✅ REMPLACÉ
    } catch (err: any) {
      toast.error(err.message || "Une erreur est survenue"); // ✅ REMPLACÉ
    }
  };

  const handleOpenReview = (training: any) => {
    setSelectedTraining(training);
    setIsModalOpen(true);
  };

  const handleSubmitReview = async (note: number, comment: string) => {
    try {
      await rateFormation(selectedTraining.id, note, comment);
      setIsModalOpen(false);
      loadTrainings();
      toast.success("Avis enregistré !"); // ✅ REMPLACÉ
    } catch (err: any) {
      toast.error(err.message || "Impossible d'enregistrer l'avis"); // ✅ REMPLACÉ
    }
  };

  return (
    <div className="space-y-8 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mes formations</h1>
        <p className="text-gray-500">Consultez et gérez vos formations inscrites</p>
      </div>

      {/* FILTRES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher des formations..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#1b5333] outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={handleFilterChange}
          className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#1b5333] cursor-pointer outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="active">En cours</option>
          <option value="completed">Terminées</option>
        </select>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400 font-medium">Chargement des formations...</div>
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
                  <p className="text-xs text-gray-400 mb-6 italic">durée du formation</p>

                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-6">
                    <Clock size={14} className="text-[#1b5333]" /> {training.duration}
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Noter cette formation</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={14} className={s <= (training.userRating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} />
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenReview(training)}
                      className="text-[10px] font-bold text-[#1b5333] hover:underline"
                    >
                      {training.userRating ? "Modifier l'avis" : "Noter"}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/apprenant/trainings/${training.id}`)}
                  className="w-full py-4 border-t border-gray-50 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen size={14} /> Voir les détails <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>

          {selectedTraining && (
            <ReviewModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSubmit={handleSubmitReview}
              trainingTitle={selectedTraining.title}
              initialNote={selectedTraining.userRating}
              initialComment={selectedTraining.userComment}
            />
          )}

          {/* PAGINATION */}
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