'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookPlus, Loader2, CheckCircle, X, Calendar, Users, ArrowLeft } from 'lucide-react';

const API_URL = 'http://localhost:5000';
const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});

export default function CataloguePage() {
  const router = useRouter();
  const [formations, setFormations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFormation, setSelectedFormation] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCatalogue();
  }, []);

  const loadCatalogue = async () => {
    try {
      const res = await fetch(`${API_URL}/student/formations/catalogue`, {
        headers: getHeaders()
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      
      const data = await res.json();
      setFormations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Catalogue error:', err);
      setError(err.message);
      setFormations([]);
    } finally {
      setLoading(false);
    }
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
      
      // ✅ SUCCESS : Rediriger vers le dashboard (espace normal)
      router.push('/apprenant/dashboard');
      
    } catch (err: any) {
      console.error('Enroll error:', err);
      setError(err.message);
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-[#1b5333] transition-colors mb-6"
        >
          <ArrowLeft size={20} /> Back
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">Training Catalogue</h1>
        <p className="text-gray-500 mt-2">Explore and enroll in our available programs</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {formations.map((f) => (
              <div key={f.id} className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{f.description}</p>
                  <div className="flex gap-2 mb-4">
                    <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">
                      {f.duration}
                    </span>
                    <span className="text-[10px] font-bold uppercase bg-gray-50 text-gray-500 px-2 py-1 rounded-md">
                      {f.instructor}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => openModal(f)}
                  className="w-full py-3 bg-[#1b5333] hover:bg-[#154128] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <BookPlus size={16} /> View Sessions
                </button>
              </div>
            ))}

            {formations.length === 0 && !loading && (
              <div className="col-span-full text-center py-20 bg-white rounded-[24px] border border-gray-100">
                <CheckCircle size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No available programs at the moment.</p>
                <p className="text-gray-400 text-sm mt-2">Check back later for new trainings.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Sessions */}
      {selectedFormation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedFormation.title}</h2>
                <p className="text-sm text-gray-500">Available sessions</p>
              </div>
              <button onClick={() => setSelectedFormation(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={18} className="text-gray-500" />
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
                  <p>No available sessions.</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{session.title || `Session #${session.id}`}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {session.date && <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(session.date).toLocaleDateString()}</span>}
                        {session.capacite != null && <span className="flex items-center gap-1"><Users size={12} /> Cap: {session.capacite}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => enroll(session.id)}
                      disabled={enrollingId === session.id}
                      className="bg-[#1b5333] hover:bg-[#154128] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                    >
                      {enrollingId === session.id ? <Loader2 size={14} className="animate-spin" /> : 'Join'}
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