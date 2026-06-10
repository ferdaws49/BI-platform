"use client";

import { useEffect, useState, useMemo } from "react";

import LearnersStats from "./learnersStats";
import LearnersTabs from "./learnersTabs";
import PendingTable from "./pendingTable";
import ValidatedTable from "./validatedTable";
import DeleteLearnerDialog from "./DeleteLearnerDialog";

export interface Apprenant {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  dateInscription: string;
  statut: "pending" | "accepted" | "rejected";
  programme?: string;
  formations: { id: number; titre: string }[];
}

const staticApprenants: Apprenant[] = [
  {
    id: 1,
    nom: "Larbi",
    prenom: "Mehdi",
    email: "mehdi@mail.com",
    telephone: "0551234567",
    dateInscription: "2024-10-01",
    statut: "pending",
    formations: [{ id: 1, titre: "Cybersécurité" }],
  },
  {
    id: 2,
    nom: "Chergui",
    prenom: "Lina",
    email: "lina@mail.com",
    telephone: "0559876543",
    dateInscription: "2024-10-05",
    statut: "pending",
    formations: [{ id: 2, titre: "IA & Machine Learning" }],
  },
  {
    id: 3,
    nom: "Saidi",
    prenom: "Amira",
    email: "amira@mail.com",
    telephone: "0661234567",
    dateInscription: "2024-10-10",
    statut: "pending",
    formations: [{ id: 3, titre: "Data Science" }],
  },
  {
    id: 4,
    nom: "Ziani",
    prenom: "Nour",
    email: "nour@mail.com",
    telephone: "0771234567",
    dateInscription: "2024-10-12",
    statut: "pending",
    formations: [{ id: 1, titre: "Cybersécurité" }],
  },
  {
    id: 5,
    nom: "Bensaid",
    prenom: "Omar",
    email: "omar@mail.com",
    telephone: "0551112233",
    dateInscription: "2024-09-15",
    statut: "accepted",
    formations: [{ id: 4, titre: "Développement Web" }],
  },
  {
    id: 6,
    nom: "Mebarki",
    prenom: "Sara",
    email: "sara@mail.com",
    telephone: "0662223344",
    dateInscription: "2024-09-20",
    statut: "accepted",
    formations: [{ id: 3, titre: "Data Science" }],
  },
  {
    id: 7,
    nom: "Hadj",
    prenom: "Karim",
    email: "karim@mail.com",
    telephone: null,
    dateInscription: "2024-08-01",
    statut: "rejected",
    formations: [],
  },
];

const PER_PAGE = 6;

export default function LearnersSection() {
  const [apprenants, setApprenants] = useState<Apprenant[]>(staticApprenants);
  const [activeTab, setActiveTab] = useState<"pending" | "validated">(
    "pending",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1); // ← nouveau
  const [deleteApprenant, setDeleteApprenant] = useState<Apprenant | null>(
    null,
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const fetchData = async () => {
      try {
        const resPending = await fetch(
          "http://localhost:5000/admin/inscriptions?status=pending",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const pendingData = resPending.ok ? await resPending.json() : [];

        const resValidated = await fetch(
          "http://localhost:5000/admin/apprenants",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const validatedData = resValidated.ok ? await resValidated.json() : [];

        setApprenants([...pendingData, ...validatedData]);
      } catch (error) {
        console.error("Erreur fetch learners:", error);
      }
    };
    fetchData();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const stats = useMemo(
    () => ({
      total: apprenants.length,
      valides: apprenants.filter((a) => a.statut === "accepted").length,
      enAttente: apprenants.filter((a) => a.statut === "pending").length,
      rejetes: apprenants.filter((a) => a.statut === "rejected").length,
    }),
    [apprenants],
  );

  // ── Pending paginé ──────────────────────────────────────
  const pendingAll = useMemo(
    () => apprenants.filter((a) => a.statut === "pending"),
    [apprenants],
  );
  const totalPagesPending = Math.max(
    1,
    Math.ceil(pendingAll.length / PER_PAGE),
  );
  const paginatedPending = pendingAll.slice(
    (pendingPage - 1) * PER_PAGE,
    pendingPage * PER_PAGE,
  );

  // ── Validated paginé ────────────────────────────────────
  const validatedFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return apprenants
      .filter((a) => a.statut === "accepted")
      .filter(
        (a) =>
          !q ||
          a.nom.toLowerCase().includes(q) ||
          a.prenom.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q),
      );
  }, [apprenants, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(validatedFiltered.length / PER_PAGE),
  );
  const paginatedValidated = validatedFiltered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  );

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const updateStatut = async (id: number, statut: "accepted" | "rejected") => {
    const token = localStorage.getItem("access_token");
    const endpoint = statut === "accepted" ? "accept" : "reject";

    setApprenants((prev) =>
      prev.map((a) => (a.id === id ? { ...a, statut } : a)),
    );

    try {
      await fetch(
        `http://localhost:5000/admin/inscriptions/${id}/${endpoint}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      showToast(
        statut === "accepted" ? "✓ Demande acceptée" : "✓ Demande rejetée",
      );
    } catch {}
  };

  const handleApprove = (id: number) => updateStatut(id, "accepted");
  const handleReject = (id: number) => updateStatut(id, "rejected");

  const handleApproveAll = async () => {
    const pendingIds = apprenants
      .filter((a) => a.statut === "pending")
      .map((a) => a.id);
    setApprenants((prev) =>
      prev.map((a) =>
        a.statut === "pending" ? { ...a, statut: "accepted" } : a,
      ),
    );
    const token = localStorage.getItem("access_token");
    try {
      await fetch("http://localhost:5000/admin/inscriptions/approve-all", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: pendingIds }),
      });
      showToast(`✓ ${pendingIds.length} demande(s) approuvée(s)`);
    } catch {}
  };

  const handleDeleteConfirm = async () => {
    if (!deleteApprenant) return;
    const token = localStorage.getItem("access_token");
    setApprenants((prev) => prev.filter((a) => a.id !== deleteApprenant.id));
    try {
      await fetch(
        `http://localhost:5000/admin/apprenants/${deleteApprenant.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showToast("✓ Apprenant supprimé");
    } catch {}
    setDeleteApprenant(null);
  };

  return (
    <div className="p-6 space-y-0">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          {toastMsg}
        </div>
      )}

      <LearnersStats
        total={stats.total}
        valides={stats.valides}
        enAttente={stats.enAttente}
        rejetes={stats.rejetes}
      />

      <LearnersTabs
        activeTab={activeTab}
        pendingCount={stats.enAttente}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setPage(1);
          setPendingPage(1); // ← reset pending page aussi
          setSearch("");
        }}
      />

      {activeTab === "pending" ? (
        <PendingTable
          apprenants={paginatedPending} // ← paginé
          onApprove={handleApprove}
          onReject={handleReject}
          onApproveAll={handleApproveAll}
          page={pendingPage} // ← nouveau
          totalPages={totalPagesPending} // ← nouveau
          onPageChange={setPendingPage} // ← nouveau
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
