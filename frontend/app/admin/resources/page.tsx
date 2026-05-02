"use client";

import { useReducer, useState, useMemo, useEffect } from "react";
import { toast as sonnerToast } from "sonner";
import { Toaster } from "sonner";
import { Plus } from "lucide-react";

import { resourcesReducer, initialResourcesState, Formation, Formateur } from "./state";
import { Header }             from "./components/header";
import { StatsStrip }         from "./components/stats-strip";
import { Tabs }               from "./components/tabs";
import { Toolbar }            from "./components/toolbar";
import { FormationsTab }      from "./components/formations-tab";
import { FormateursTab }      from "./components/formateurs-tab";
import { FormationFormModal } from "./components/formation-form";
import { FormateurFormModal } from "./components/formateur-form";
import { Button }             from "./components/ui";

const API = "http://localhost:5000";

export default function AdminResourcesPage() {
  const [state, dispatch] = useReducer(resourcesReducer, initialResourcesState);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<{
    type: "formation" | "formateur" | null;
    mode: "create" | "edit";
    data: Formation | Formateur | null;
  }>({ type: null, mode: "create", data: null });

  const closeModal = () => setModal({ type: null, mode: "create", data: null });

  // ─── Fetch initial ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };

      try {
        setLoading(true);
        const [formationsRes, formateursRes] = await Promise.allSettled([
          fetch(`${API}/responsable/formations`, { headers }),
          fetch(`${API}/responsable/formateurs`, { headers }),
        ]);

        // ── Formations ──
        if (formationsRes.status === "fulfilled" && formationsRes.value.ok) {
          const data = await formationsRes.value.json();
          const mapped: Formation[] = data.map((f: any) => ({
            id: String(f.id),
            titre: f.titre || "Sans titre",
            categorie: f.categorie || "",
            description: f.description || "",
            dureeHeures: Number(f.dureeHeures) || 0,
            prix: parseFloat(f.prix) || 0,
            niveauType: (f.niveauType as "présentiel" | "en_ligne") ?? "présentiel",
            statut: (f.statut as "active" | "completed") ?? "active",
            nbSessions: f.nbSessions ?? f.sessions?.length,
          }));
          dispatch({ type: "SET_FORMATIONS", payload: mapped });

          // Catégories uniques depuis les formations
          const cats = [...new Set(mapped.map((f) => f.categorie).filter(Boolean))];
          dispatch({ type: "SET_CATEGORIES", payload: cats });
        }

        // ── Formateurs ──
        if (formateursRes.status === "fulfilled" && formateursRes.value.ok) {
          const data = await formateursRes.value.json();
          const mapped: Formateur[] = data.map((f: any) => ({
            id: String(f.id),
            nom: f.nom || "",
            prenom: f.prenom || "",
            email: f.email || "",
            specialite: f.specialite || "",
            telephone: f.telephone || "",
            rating: f.rating ?? 4.5,
          }));
          dispatch({ type: "SET_FORMATEURS", payload: mapped });

          // Spécialités uniques depuis les formateurs
          const specs = [...new Set(mapped.map((f) => f.specialite).filter(Boolean))];
          dispatch({ type: "SET_SPECIALITES", payload: specs });
        }
      } catch {
        sonnerToast.error("Erreur de connexion au serveur");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // ─── CRUD Formations ──────────────────────────────────────────────────────
  const handleAddFormation = async (data: any): Promise<void> => {
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API}/responsable/formations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      const newF: Formation = { ...data, id: String(result.id), nbSessions: 0 };
      dispatch({ type: "ADD_FORMATION", payload: newF });

      // Zid la catégorie si nouvelle
      if (data.categorie && !state.categories.includes(data.categorie)) {
        dispatch({ type: "SET_CATEGORIES", payload: [...state.categories, data.categorie] });
      }

      sonnerToast.success("Formation créée avec succès");
      closeModal();
    } catch {
      sonnerToast.error("Erreur lors de la création");
    }
  };

  const handleUpdateFormation = async (data: any): Promise<void> => {
    const token = localStorage.getItem("access_token");
    try {
      const { id, nbSessions, ...bodyData } = data; // Strip id and calculated fields
      const res = await fetch(`${API}/responsable/formations/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });
      if (!res.ok) throw new Error();
      dispatch({ type: "UPDATE_FORMATION", payload: data });

      if (data.categorie && !state.categories.includes(data.categorie)) {
        dispatch({ type: "SET_CATEGORIES", payload: [...state.categories, data.categorie] });
      }

      sonnerToast.success("Formation mise à jour");
      closeModal();
    } catch {
      sonnerToast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteFormation = async (id: string) => {
    const token = localStorage.getItem("access_token");
    try {
      await fetch(`${API}/responsable/formations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      dispatch({ type: "DELETE_FORMATION", payload: id });
      sonnerToast.success("Formation supprimée");
    } catch {
      sonnerToast.error("Erreur lors de la suppression");
    }
  };

  // ─── CRUD Formateurs ──────────────────────────────────────────────────────
  const handleAddFormateur = async (data: any) => {
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API}/responsable/formateurs`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      const newF: Formateur = { ...data, id: String(result.id), rating: 4.5 };
      dispatch({ type: "ADD_FORMATEUR", payload: newF });

      // Zid la spécialité si nouvelle
      if (data.specialite && !state.specialites.includes(data.specialite)) {
        dispatch({ type: "SET_SPECIALITES", payload: [...state.specialites, data.specialite] });
      }

      sonnerToast.success("Formateur ajouté avec succès");
      closeModal();
    } catch {
      sonnerToast.error("Erreur lors de l'ajout");
    }
  };

  const handleUpdateFormateur = async (data: any) => {
    const token = localStorage.getItem("access_token");
    try {
      const { id, rating, ...bodyData } = data; // Strip id and internal fields
      const res = await fetch(`${API}/responsable/formateurs/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });
      if (!res.ok) throw new Error();
      dispatch({ type: "UPDATE_FORMATEUR", payload: data });

      if (data.specialite && !state.specialites.includes(data.specialite)) {
        dispatch({ type: "SET_SPECIALITES", payload: [...state.specialites, data.specialite] });
      }

      sonnerToast.success("Formateur mis à jour");
      closeModal();
    } catch {
      sonnerToast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteFormateur = async (id: string) => {
    const token = localStorage.getItem("access_token");
    try {
      await fetch(`${API}/responsable/formateurs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      dispatch({ type: "DELETE_FORMATEUR", payload: id });
      sonnerToast.success("Formateur supprimé");
    } catch {
      sonnerToast.error("Erreur lors de la suppression");
    }
  };

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    formationsCount: state.formations.length,
    formateursCount: state.formateurs.length,
    avgRating:
      state.formateurs.length > 0
        ? (state.formateurs.reduce((acc, f) => acc + (f.rating || 0), 0) / state.formateurs.length).toFixed(1)
        : "N/A",
    categoriesCount: state.categories.length,
  }), [state.formations, state.formateurs, state.categories]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-12 w-full max-w-7xl mx-auto px-4 sm:px-6 mt-6">
      <Toaster position="top-right" richColors />
      <Header />
      <StatsStrip stats={stats} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <Tabs state={state} dispatch={dispatch} />
        <Button
          onClick={() =>
            setModal({
              type: state.activeTab === "formations" ? "formation" : "formateur",
              mode: "create",
              data: null,
            })
          }
          className="shadow-md btn-primary bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white border-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          {state.activeTab === "formations" ? "Nouvelle formation" : "Nouveau formateur"}
        </Button>
      </div>

      <Toolbar state={state} dispatch={dispatch} />

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm animate-pulse">
          Chargement des données...
        </div>
      ) : (
        <div className="relative mt-2">
          <div style={{ display: state.activeTab === "formations" ? "block" : "none" }} aria-hidden={state.activeTab !== "formations"}>
            <FormationsTab state={state} dispatch={dispatch} onDelete={handleDeleteFormation} onEdit={(data) => setModal({ type: "formation", mode: "edit", data })} />
          </div>
          <div style={{ display: state.activeTab === "formateurs" ? "block" : "none" }} aria-hidden={state.activeTab !== "formateurs"}>
            <FormateursTab state={state} dispatch={dispatch} onDelete={handleDeleteFormateur} onEdit={(data) => setModal({ type: "formateur", mode: "edit", data })} />
          </div>
        </div>
      )}

      <FormationFormModal
        isOpen={modal.type === "formation"}
        onOpenChange={(open) => !open && closeModal()}
        onSave={modal.mode === "create" ? handleAddFormation : handleUpdateFormation}
        editModeData={modal.data as Formation | undefined}
        categories={state.categories}
      />

      <FormateurFormModal
        isOpen={modal.type === "formateur"}
        onOpenChange={(open) => !open && closeModal()}
        onSave={modal.mode === "create" ? handleAddFormateur : handleUpdateFormateur}
        editModeData={modal.data as Formateur | undefined}
      />
    </div>
  );
}