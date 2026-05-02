"use client"

import { useEffect, useState, useMemo } from "react";

// ── Sous-composants ─────────────────────────────────────────
import LearnersStats       from "./learnersStats";
import LearnersTabs        from "./learnersTabs";
import PendingTable        from "./pendingTable";
import ValidatedTable      from "./validatedTable";
import DeleteLearnerDialog from "./DeleteLearnerDialog";

// ─────────────────────────────────────────────────────────────
// TYPE : Apprenant — basé sur l'entité NestJS
// ─────────────────────────────────────────────────────────────
export interface Apprenant {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  dateInscription: string;
  statut: "pending" | "accepted" | "rejected";
  programme?: string; // New field from inscriptions workflow
  formations: { id: number; titre: string }[];
}

// ─────────────────────────────────────────────────────────────
// DONNÉES STATIQUES — fallback si API indisponible
// ─────────────────────────────────────────────────────────────
const staticApprenants: Apprenant[] = [
  { id: 1, nom: "Larbi",   prenom: "Mehdi",  email: "mehdi@mail.com",  telephone: "0551234567", dateInscription: "2024-10-01", statut: "pending",  formations: [{ id: 1, titre: "Cybersécurité" }] },
  { id: 2, nom: "Chergui", prenom: "Lina",   email: "lina@mail.com",   telephone: "0559876543", dateInscription: "2024-10-05", statut: "pending",  formations: [{ id: 2, titre: "IA & Machine Learning" }] },
  { id: 3, nom: "Saidi",   prenom: "Amira",  email: "amira@mail.com",  telephone: "0661234567", dateInscription: "2024-10-10", statut: "pending",  formations: [{ id: 3, titre: "Data Science" }] },
  { id: 4, nom: "Ziani",   prenom: "Nour",   email: "nour@mail.com",   telephone: "0771234567", dateInscription: "2024-10-12", statut: "pending",  formations: [{ id: 1, titre: "Cybersécurité" }] },
  { id: 5, nom: "Bensaid", prenom: "Omar",   email: "omar@mail.com",   telephone: "0551112233", dateInscription: "2024-09-15", statut: "accepted", formations: [{ id: 4, titre: "Développement Web" }] },
  { id: 6, nom: "Mebarki", prenom: "Sara",   email: "sara@mail.com",   telephone: "0662223344", dateInscription: "2024-09-20", statut: "accepted", formations: [{ id: 3, titre: "Data Science" }] },
  { id: 7, nom: "Hadj",    prenom: "Karim",  email: "karim@mail.com",  telephone: null,         dateInscription: "2024-08-01", statut: "rejected", formations: [] },
];

const PER_PAGE = 6;

// ─────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL : LearnersSection
// Pattern identique à KPISection du directeur :
// → Tout le code ici (state + fetch + handlers + rendu)
// → page.tsx est juste : <LearnersSection />
// ─────────────────────────────────────────────────────────────
export default function LearnersSection() {

  // ── State : données ─────────────────────────────────────
  const [apprenants, setApprenants] = useState<Apprenant[]>(staticApprenants);

  // ── State : navigation tabs ──────────────────────────────
  const [activeTab, setActiveTab] = useState<"pending" | "validated">("pending");

  // ── State : recherche + pagination (tab 2 seulement) ────
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);

  // ── State : dialog suppression ──────────────────────────
  const [deleteApprenant, setDeleteApprenant] = useState<Apprenant | null>(null);

  // ── State : toast notification ──────────────────────────
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────
  // FETCH : GET /admin/apprenants
  // Si API down → static data déjà initialisée
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("access_token");

    const fetchData = async () => {
      try {
        // 1. Fetch pending inscriptions
        const resPending = await fetch("http://localhost:5000/admin/inscriptions?status=pending", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pendingData = resPending.ok ? await resPending.json() : [];

        // 2. Fetch validated apprenants
        const resValidated = await fetch("http://localhost:5000/admin/apprenants", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const validatedData = resValidated.ok ? await resValidated.json() : [];

        // 3. Combine both
        setApprenants([...pendingData, ...validatedData]);
      } catch (error) {
        console.error("Erreur fetch learners:", error);
      }
    };

    fetchData();
  }, []);

  // ── Helper : toast temporaire ────────────────────────────
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ─────────────────────────────────────────────────────────
  // STATS : calculées depuis la liste complète
  // ─────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     apprenants.length,
    valides:   apprenants.filter((a) => a.statut === "accepted").length,
    enAttente: apprenants.filter((a) => a.statut === "pending").length,
    rejetes:   apprenants.filter((a) => a.statut === "rejected").length,
  }), [apprenants]);

  // ─────────────────────────────────────────────────────────
  // DONNÉES TAB 2 : apprenants accepted + filtre search
  // ─────────────────────────────────────────────────────────
  const validatedFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return apprenants
      .filter((a) => a.statut === "accepted")
      .filter((a) =>
        !q ||
        a.nom.toLowerCase().includes(q) ||
        a.prenom.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
      );
  }, [apprenants, search]);

  const totalPages       = Math.max(1, Math.ceil(validatedFiltered.length / PER_PAGE));
  const paginatedValidated = validatedFiltered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };

  // ─────────────────────────────────────────────────────────
  // HANDLER : changer le statut d'un apprenant
  // PATCH /admin/apprenants/:id/status → { statut }
  // Optimistic update : UI change immédiatement
  // ─────────────────────────────────────────────────────────
  const updateStatut = async (id: number, statut: "accepted" | "rejected") => {
    const token = localStorage.getItem("access_token");

    // Optimistic update
    setApprenants((prev) =>
      prev.map((a) => (a.id === id ? { ...a, statut } : a))
    );

    const endpoint = statut === "accepted" ? "accept" : "reject";

    try {
      await fetch(`http://localhost:5000/admin/inscriptions/${id}/${endpoint}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      showToast(statut === "accepted" ? "✓ Demande acceptée (User créé)" : "✓ Demande rejetée");
    } catch {
      // Mode dev sans backend → garder le changement optimiste
    }
  };

  const handleApprove    = (id: number) => updateStatut(id, "accepted");
  const handleReject     = (id: number) => updateStatut(id, "rejected");

  // ─────────────────────────────────────────────────────────
  // HANDLER : approuver tous les pending
  // PATCH /admin/apprenants/approve-all → { ids: number[] }
  // ─────────────────────────────────────────────────────────
  const handleApproveAll = async () => {
    const pendingIds = apprenants.filter((a) => a.statut === "pending").map((a) => a.id);

    // Optimistic update
    setApprenants((prev) =>
      prev.map((a) => (a.statut === "pending" ? { ...a, statut: "accepted" } : a))
    );

    const token = localStorage.getItem("access_token");
    try {
      await fetch("http://localhost:5000/admin/inscriptions/approve-all", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: pendingIds }),
      });
      showToast(`✓ ${pendingIds.length} demande(s) approuvée(s)`);
    } catch {}
  };

  // ─────────────────────────────────────────────────────────
  // HANDLER : supprimer un apprenant
  // DELETE /admin/apprenants/:id
  // ─────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteApprenant) return;
    const token = localStorage.getItem("access_token");

    setApprenants((prev) => prev.filter((a) => a.id !== deleteApprenant.id));

    try {
      await fetch(`http://localhost:5000/admin/apprenants/${deleteApprenant.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("✓ Apprenant supprimé");
    } catch {}

    setDeleteApprenant(null);
  };

  // ─────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-0">

      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          {toastMsg}
        </div>
      )}

      {/* 1. Stats cards */}
      <LearnersStats
        total={stats.total}
        valides={stats.valides}
        enAttente={stats.enAttente}
        rejetes={stats.rejetes}
      />

      {/* 2. Tabs switcher */}
      <LearnersTabs
        activeTab={activeTab}
        pendingCount={stats.enAttente}
        onTabChange={(tab) => { setActiveTab(tab); setPage(1); setSearch(""); }}
      />

      {/* 3. Contenu selon tab actif */}
      {activeTab === "pending" ? (
        <PendingTable
          apprenants={apprenants}
          onApprove={handleApprove}
          onReject={handleReject}
          onApproveAll={handleApproveAll}
        />
      ) : (
        <ValidatedTable
          apprenants={paginatedValidated}
          search={search}
          page={page}
          totalPages={totalPages}
          onSearchChange={handleSearchChange}
          onPageChange={setPage}
          onDelete={setDeleteApprenant}
        />
      )}

      {/* 4. Dialog suppression */}
      {deleteApprenant && (
        <DeleteLearnerDialog
          apprenant={deleteApprenant}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteApprenant(null)}
        />
      )}
    </div>
  );
}