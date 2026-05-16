"use client";

import { useState, useEffect, useMemo } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { toast } from "sonner";
import CalendarView from "./components/CalendarView";
import SessionsTable from "./components/SessionsTable";
import CreateSessionModal from "./components/CreateSessionModal";
import AssignFormateurModal from "./components/AssignFormateurModal";
import ParticipantsListModal from "./components/ParticipantsListModal";
import PresenceModal from "./components/PresenceModal";
import CreateFormationModal from "./components/CreateFormationModal";

import { 
  API_URL, 
  normalizeSession,
  Session, 
  Formateur, 
  Formation, 
  FilterOptions 
} from "./constants";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "table">("table");
  const [filters, setFilters] = useState<FilterOptions>({
    periode: "",
    formation: "",
    formateur: "",
    statut: "",
  });
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const { addNotification } = useNotifications();

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [createFormationModal, setCreateFormationModal] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [assignModal, setAssignModal] = useState<Session | null>(null);
  const [participantsModal, setParticipantsModal] = useState<Session | null>(null);
  const [presenceModal, setPresenceModal] = useState<Session | null>(null);

  // ── Fetch data ───────────────────────────────────────────────────────────────
  const fetchAll = () => {
    const token = localStorage.getItem("access_token");
    setLoading(true);

    Promise.allSettled([
      fetch(`${API_URL}/responsable/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_URL}/responsable/formateurs`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_URL}/responsable/formations`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([sessRes, fmtRes, fRes]) => {
        if (sessRes.status === "fulfilled" && sessRes.value.ok) {
          const data = await sessRes.value.json();
          const rawS = Array.isArray(data) ? data : [];
          console.log("RAW SESSIONS FROM BACKEND:", rawS);
          // ✅ Traduction des statuts pour le Frontend
          const mapped = rawS.map((s: Parameters<typeof normalizeSession>[0]) =>
            normalizeSession(s),
          );
          setSessions(mapped);
        }
        if (fmtRes.status === "fulfilled" && fmtRes.value.ok) {
          const data = await fmtRes.value.json();
          setFormateurs(Array.isArray(data) ? data : []);
        }
        if (fRes.status === "fulfilled" && fRes.value.ok) {
          const data = await fRes.value.json();
          setFormations(Array.isArray(data) ? data : []);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    setActiveFiltersCount(Object.values(filters).filter(Boolean).length);
  }, [filters]);

  // ── Filtered sessions ─────────────────────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filters.statut && s.statut !== filters.statut) return false;
      if (filters.formation && String(s.formationId) !== filters.formation)
        return false;
      if (filters.formateur && String(s.formateurId) !== filters.formateur)
        return false;
      if (filters.periode) {
        const now = new Date();
        const d = new Date(s.date);
        if (filters.periode === "week") {
          const start = new Date();
          start.setDate(now.getDate() - 7);
          if (d < start) return false;
        }
        if (filters.periode === "month") {
          if (
            d.getMonth() !== now.getMonth() ||
            d.getFullYear() !== now.getFullYear()
          )
            return false;
        }
        if (filters.periode === "year") {
          if (d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [sessions, filters]);

  // ── Stats KPI ─────────────────────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      total: filteredSessions.length,
      actif: filteredSessions.filter((s) => s.statut === "Actif").length,
      termine: filteredSessions.filter((s) => s.statut === "Terminé").length,
      annule: filteredSessions.filter((s) => s.statut === "Annulé").length,
      // Revenue total des sessions filtrées (hors annulées)
      revenue: filteredSessions
        .filter((s) => s.statut !== "Annulé")
        .reduce((sum, s) => sum + (s.revenue ?? 0), 0),
    }),
    [filteredSessions],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCreate = async (data: Partial<Session>) => {
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API_URL}/responsable/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        toast.error(error.message || "Erreur lors de la création");
        return;
      }
      const newSession: Session = normalizeSession(await res.json());
      setSessions((prev) => [newSession, ...prev]);
      setCreateModal(false);
      
      // ✅ Feedback immédiat
      toast.success("Session créée avec succès !");
      
      // ✅ Notification persistante
      addNotification(
        "Session créée",
        `La session du ${newSession.date} a été créée avec succès.`,
        "success",
        "accountChanges"
      );
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleEdit = async (id: string, data: Partial<Session>) => {
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API_URL}/responsable/sessions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        toast.error(error.message || "Erreur lors de la modification");
        return;
      }
      const updated: Session = normalizeSession(await res.json());
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setEditSession(null);

      // ✅ Feedback immédiat
      toast.success("Session mise à jour !");

      // ✅ Notification persistante
      addNotification(
        "Session modifiée",
        "La session a été mise à jour.",
        "info",
        "accountChanges"
      );
    } catch {
      toast.error("Erreur réseau");
    }
  };

  // DELETE → backend retourne { success: true } → màj statut localement
  const handleAnnuler = async (id: string) => {
    if (!confirm("Annuler cette session ?")) return;
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API_URL}/responsable/sessions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const error = await res.json();
        toast.error(error.message || "Erreur lors de l'annulation");
        return;
      }
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, statut: "Annulé" as const, revenue: 0 } : s,
        ),
      );

      // ✅ Feedback immédiat
      toast.error("Session annulée.");

      // ✅ Notification persistante
      addNotification(
        "Session annulée",
        "La session a été annulée avec succès.",
        "warning",
        "accountChanges"
      );
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleAssignFormateur = async (
    sessionId: string,
    formateurId: number | null,
  ) => {
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API_URL}/responsable/sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formateurId }),
      });
      if (!res.ok) {
        const error = await res.json();
        toast.error(error.message || "Erreur lors de l'affectation");
        return;
      }
      const updated: Session = normalizeSession(await res.json());
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? updated : s)),
      );
      setAssignModal(null);

      // ✅ Feedback immédiat
      toast.success("Formateur affecté avec succès !");

      // ✅ Notification persistante
      addNotification(
        "Formateur affecté",
        `Le formateur a été affecté à la session du ${updated.date}.`,
        "success",
        "trainerUpdates"
      );
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleFormationCreated = (newFormation: Formation) => {
    setFormations((prev) => [newFormation, ...prev]);

    // ✅ Feedback immédiat
    toast.success(`Formation "${newFormation.titre}" créée !`);

    // ✅ Notification persistante
    addNotification(
      "Formation créée",
      `La formation "${newFormation.titre}" a été ajoutée.`,
      "success",
      "accountChanges"
    );
  };

  const resetFilters = () =>
    setFilters({ periode: "", formation: "", formateur: "", statut: "" });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header sticky */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Planning des Sessions
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {stats.total} session{stats.total > 1 ? "s" : ""}
                {activeFiltersCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-indigo-600 font-medium">
                    · {activeFiltersCount} filtre
                    {activeFiltersCount > 1 ? "s" : ""} actif
                    {activeFiltersCount > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setView("table")}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    view === "table"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ☰ Tableau
                </button>
                <button
                  onClick={() => setView("calendar")}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    view === "calendar"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  📅 Calendrier
                </button>
              </div>
              <button
                onClick={() => setCreateFormationModal(true)}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 transition-colors"
              >
                <span className="text-lg leading-none">+</span>
                Nouvelle formation
              </button>
              <button
                onClick={() => setCreateModal(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                <span className="text-lg leading-none">+</span>
                Nouvelle session
              </button>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={filters.periode}
              onChange={(e) =>
                setFilters((f) => ({ ...f, periode: e.target.value }))
              }
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">Toutes périodes</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
            </select>

            <select
              value={filters.formation}
              onChange={(e) =>
                setFilters((f) => ({ ...f, formation: e.target.value }))
              }
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">Toutes formations</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.titre}
                </option>
              ))}
            </select>

            <select
              value={filters.formateur}
              onChange={(e) =>
                setFilters((f) => ({ ...f, formateur: e.target.value }))
              }
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">Tous formateurs</option>
              {formateurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.prenom} {f.nom}
                </option>
              ))}
            </select>

            <select
              value={filters.statut}
              onChange={(e) =>
                setFilters((f) => ({ ...f, statut: e.target.value }))
              }
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">Tous statuts</option>
              <option value="Actif">Actif</option>
              <option value="Terminé">Terminé</option>
              <option value="Annulé">Annulé</option>
            </select>

            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-sm text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕ Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total sessions",
              value: stats.total,
              color: "bg-indigo-50 border-indigo-100 text-indigo-900",
              sub: "text-indigo-500",
            },
            {
              label: "Actives",
              value: stats.actif,
              color: "bg-blue-50 border-blue-100 text-blue-900",
              sub: "text-blue-400",
            },
            {
              label: "Terminées",
              value: stats.termine,
              color: "bg-emerald-50 border-emerald-100 text-emerald-900",
              sub: "text-emerald-400",
            },
            {
              label: "Annulées",
              value: stats.annule,
              color: "bg-red-50 border-red-100 text-red-900",
              sub: "text-red-400",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border p-4 ${stat.color}`}
            >
              <p
                className={`text-xs font-medium uppercase tracking-wide ${stat.sub}`}
              >
                {stat.label}
              </p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Vue principale */}
        {view === "table" ? (
          <SessionsTable
            sessions={filteredSessions}
            loading={loading}
            onEdit={(s) => setEditSession(s)}
            onAnnuler={handleAnnuler}
            onAssignFormateur={(s) => setAssignModal(s)}
            onVoirParticipants={(s) => setParticipantsModal(s)}
            onPresence={(s) => setPresenceModal(s)}
          />
        ) : (
          <CalendarView
            sessions={filteredSessions}
            loading={loading}
            onEdit={(s) => setEditSession(s)}
            onAssignFormateur={(s) => setAssignModal(s)}
            onVoirParticipants={(s) => setParticipantsModal(s)}
            onPresence={(s) => setPresenceModal(s)}
          />
        )}
      </div>

      {/* Modals */}
      {createFormationModal && (
        <CreateFormationModal
          onClose={() => setCreateFormationModal(false)}
          onCreated={handleFormationCreated}
        />
      )}

      {(createModal || editSession) && (
        <CreateSessionModal
          session={editSession}
          formations={formations}
          formateurs={formateurs}
          onClose={() => {
            setCreateModal(false);
            setEditSession(null);
          }}
          onSubmit={
            editSession
              ? (data) => handleEdit(editSession.id, data)
              : handleCreate
          }
        />
      )}

      {assignModal && (
        <AssignFormateurModal
          session={assignModal}
          formateurs={formateurs}
          onClose={() => setAssignModal(null)}
          onAssign={(formateurId) =>
            handleAssignFormateur(assignModal.id, formateurId)
          }
        />
      )}

      {participantsModal && (
        <ParticipantsListModal
          session={participantsModal}
          onClose={() => setParticipantsModal(null)}
        />
      )}

      {presenceModal && (
        <PresenceModal
          session={presenceModal}
          onClose={() => setPresenceModal(null)}
        />
      )}
    </div>
  );
}
