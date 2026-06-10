'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookPlus, Loader2, CheckCircle, X, Calendar, Users, ArrowLeft, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = 'http://localhost:5000';
const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});

export default function CataloguePage() {
  const router = useRouter();
  const [formations, setFormations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const [selectedFormation, setSelectedFormation] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCatalogue(1);
  }, []);

  const loadCatalogue = async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/student/formations/catalogue?page=${page}&limit=${ITEMS_PER_PAGE}`,
        { headers: getHeaders() }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const result = await res.json();

      // ✅ Si le backend retourne encore un tableau simple (ancien format)
      if (Array.isArray(result)) {
        setFormations(result);
        setTotalPages(1);
        setCurrentPage(1);
      } else {
        // ✅ Nouveau format paginé
        setFormations(result.data || []);
        setTotalPages(result.meta?.totalPages || 1);
        setCurrentPage(result.meta?.currentPage || 1);
      }
    } catch (err: any) {
      console.error('Catalogue error:', err);
      setError(err.message);
      setFormations([]);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    loadCatalogue(page);
  };

  const openModal = async (f: any) => {
    setSelectedFormation(f);
    setLoadingSessions(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/student/formations/${f.id}/available-sessions`, {
        headers: getHeaders()
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Sessions error:', err);
      setError(err.message);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const enroll = async (sessionId: number) => {
    setEnrollingId(sessionId);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/inscriptions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ sessionId, formationId: selectedFormation.id }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Inscription failed');
      }

      router.push('/apprenant/dashboard');

    } catch (err: any) {
      console.error('Enroll error:', err);
      setError(err.message);
    } finally {
      setEnrollingId(null);
    }
  };

  // ─── Pagination ───
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);

    return (
      <div className="flex justify-center items-center gap-2 mt-10">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={18} />
        </button>

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => goToPage(page)}
            className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
              currentPage === page
                ? 'bg-[#1b5333] text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-[#1b5333] transition-colors mb-6"
        >
          <ArrowLeft size={20} /> Retour
        </button>

        <h1 className="text-3xl font-bold text-gray-900">Catalogue de formations</h1>
        <p className="text-gray-500 mt-2">Découvrez et inscrivez-vous à nos programmes disponibles</p>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          Error: {error}
        </div>
      )}

      {/* Catalogue Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {formations.map((f) => (
                <div key={f.id} className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all flex flex-col">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{f.title}</h3>
                    <div className="flex gap-2 mb-4">
                      <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">
                        {f.duration}
                      </span>
                      <span className="text-[10px] font-bold uppercase bg-gray-50 text-gray-500 px-2 py-1 rounded-md">
                        {f.categorie || 'Non catégorisé'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => openModal(f)}
                    className="w-full py-3 bg-[#1b5333] hover:bg-[#154128] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <BookPlus size={16} /> Voir les sessions
                  </button>
                </div>
              ))}

              {formations.length === 0 && !loading && (
                <div className="col-span-full text-center py-20 bg-white rounded-[24px] border border-gray-100">
                  <CheckCircle size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">Aucune formation disponible pour le moment.</p>
                  <p className="text-gray-400 text-sm mt-2">Revenez plus tard pour de nouvelles formations.</p>
                </div>
              )}
            </div>

            {/* ✅ PAGINATION */}
            {renderPagination()}
          </>
        )}
      </div>

      {/* Modal Sessions */}
      {selectedFormation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedFormation.title}</h2>
                <p className="text-sm text-gray-500">Sessions disponibles</p>
              </div>
              <button
                onClick={() => setSelectedFormation(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {loadingSessions ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-emerald-500" size={32} />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
                  <p>Aucune session disponible.</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{session.title || `Session #${session.id}`}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {session.date && <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(session.date).toLocaleDateString()}</span>}
                        {session.prix != null && <span className="flex items-center gap-1"><DollarSign size={12} /> Prix : {session.prix}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => enroll(session.id)}
                      disabled={enrollingId === session.id}
                      className="bg-[#1b5333] hover:bg-[#154128] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                    >
                      {enrollingId === session.id ? <Loader2 size={14} className="animate-spin" /> : `S'inscrire`}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}