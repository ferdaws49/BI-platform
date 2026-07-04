"use client";

import { useReducer, useState, useMemo, useEffect } from "react";
import { toast as sonnerToast } from "sonner";
import { Toaster } from "sonner";
import { Plus } from "lucide-react";

import {
  resourcesReducer,
  initialResourcesState,
  Formation,
  Formateur,
} from "./state";
import { Header } from "./components/header";
import { StatsStrip } from "./components/stats-strip";
import { Tabs } from "./components/tabs";
import { Toolbar } from "./components/toolbar";
import { FormationsTab } from "./components/formations-tab";
import { FormateursTab } from "./components/formateurs-tab";
import { FormationFormModal, SavePayload } from "./components/formation-form";
import { FormateurFormModal } from "./components/formateur-form";
import { Button } from "./components/ui";

const API = "http://localhost:5000";

// ─── Types API ────────────────────────────────────────────────────────────────
type FormationApiItem = {
  id: string | number;
  titre?: string;
  categorie?: string;
  description?: string;
  dureeHeures?: number | string | null;
  prix?: number | string | null;
  statut?: Formation["statut"];
  nbSessions?: number | null;
};

type FormateurApiItem = {
  id: string | number;
  nom?: string;
  prenom?: string;
  email?: string;
  specialite?: string;
  telephone?: string;
  rating?: number;
  nbSessions?: number;
};

type FormateurPayload = Omit<Formateur, "id" | "rating"> &
  Partial<Pick<Formateur, "id" | "rating">>;

// ─── Mapping API → state (sans niveauType) ────────────────────────────────────
function mapFormationApiItem(f: FormationApiItem): Formation {
  return {
    id: String(f.id),
    titre: f.titre || "",
    categorie: f.categorie || "",
    description: f.description || "",
    dureeHeures: Number(f.dureeHeures) || 0,
    prix: Number(f.prix) || 0,
    niveauType: "présentiel", // hardcoded — colonne absente de la DB
    statut: f.statut ?? "active",
    nbSessions: f.nbSessions ?? 0,
  };
}

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
          const data: FormationApiItem[] = await formationsRes.value.json();
          const mapped: Formation[] = data.map(mapFormationApiItem);
          dispatch({ type: "SET_FORMATIONS", payload: mapped });

          const cats = [
            ...new Set(mapped.map((f) => f.categorie).filter(Boolean)),
          ];
          dispatch({ type: "SET_CATEGORIES", payload: cats });
        }

        // ── Formateurs ──
        if (formateursRes.status === "fulfilled" && formateursRes.value.ok) {
          const data: FormateurApiItem[] = await formateursRes.value.json();
          const mapped: Formateur[] = data.map((f) => ({
            id: String(f.id),
            nom: f.nom || "",
            prenom: f.prenom || "",
            email: f.email || "",
            specialite: f.specialite || "",
            telephone: f.telephone || "",
            rating: f.rating ?? 4.5,
            nbSessions: f.nbSessions ?? 0,
          }));
          dispatch({ type: "SET_FORMATEURS", payload: mapped });

          const specs = [
            ...new Set(mapped.map((f) => f.specialite).filter(Boolean)),
          ];
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
  const handleAddFormation = async (data: SavePayload): Promise<void> => {
    const token = localStorage.getItem("access_token");
    // nbSessions est calculé par le backend — on ne l'envoie pas
    // niveauType absent de la DB — on ne l'envoie pas non plus
    const { nbSessions, dureeHeures, ...rest } = data;
    const body = {
      titre: rest.titre,
      categorie: rest.categorie,
      description: rest.description,
      prix: rest.prix,
      statut: rest.statut,
    };

    try {
      const res = await fetch(`${API}/responsable/formations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ Création formation error:", res.status, errText);
        sonnerToast.error(`Erreur ${res.status}`);
        return;
      }

      const result: FormationApiItem = await res.json();
      const newF = mapFormationApiItem({
        ...result,
        titre: result.titre ?? body.titre,
        categorie: result.categorie ?? body.categorie,
        description: result.description ?? body.description,
        prix: result.prix ?? body.prix,
        statut: result.statut ?? body.statut,
        dureeHeures: result.dureeHeures ?? 0,
        nbSessions: result.nbSessions ?? 0,
      });

      dispatch({ type: "ADD_FORMATION", payload: newF });

      if (newF.categorie && !state.categories.includes(newF.categorie)) {
        dispatch({
          type: "SET_CATEGORIES",
          payload: [...state.categories, newF.categorie],
        });
      }

      sonnerToast.success("Formation créée avec succès");
      closeModal();
    } catch (e) {
      console.error("❌ handleAddFormation exception:", e);
      sonnerToast.error("Erreur lors de la création");
    }
  };

  const handleUpdateFormation = async (data: SavePayload): Promise<void> => {
    const token = localStorage.getItem("access_token");
    const { id, nbSessions, dureeHeures, ...rest } = data;

    if (!id) {
      sonnerToast.error("Identifiant de formation manquant");
      return;
    }

    const body = {
      titre: rest.titre,
      categorie: rest.categorie,
      description: rest.description,
      prix: rest.prix,
      statut: rest.statut,
    };

    try {
      const res = await fetch(`${API}/responsable/formations/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ Update formation error:", res.status, errText);
        sonnerToast.error(`Erreur ${res.status}`);
        return;
      }

      const result: FormationApiItem = await res.json();
      const updatedFormation = mapFormationApiItem({
        ...result,
        id,
        titre: result.titre ?? body.titre,
        categorie: result.categorie ?? body.categorie,
        description: result.description ?? body.description,
        prix: result.prix ?? body.prix,
        statut: result.statut ?? body.statut,
        dureeHeures: result.dureeHeures ?? dureeHeures,
        nbSessions: result.nbSessions ?? nbSessions,
      });

      dispatch({ type: "UPDATE_FORMATION", payload: updatedFormation });

      if (
        updatedFormation.categorie &&
        !state.categories.includes(updatedFormation.categorie)
      ) {
        dispatch({
          type: "SET_CATEGORIES",
          payload: [...state.categories, updatedFormation.categorie],
        });
      }

      sonnerToast.success("Formation mise à jour");
      closeModal();
    } catch (e) {
      console.error("❌ handleUpdateFormation exception:", e);
      sonnerToast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteFormation = async (id: string) => {
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API}/responsable/formations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ Delete formation error:", res.status, errText);
        sonnerToast.error(`Erreur ${res.status}`);
        return;
      }

      dispatch({ type: "DELETE_FORMATION", payload: id });
      sonnerToast.success("Formation supprimée");
    } catch (e) {
      console.error("❌ handleDeleteFormation exception:", e);
      sonnerToast.error("Erreur lors de la suppression");
    }
  };

  // ─── CRUD Formateurs ──────────────────────────────────────────────────────
  const handleAddFormateur = async (data: FormateurPayload): Promise<void> => {
    const token = localStorage.getItem("access_token");
    const body = {
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      specialite: data.specialite,
      telephone: data.telephone || "",
    };

    try {
      const res = await fetch(`${API}/responsable/formateurs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ Création formateur error:", res.status, errText);
        sonnerToast.error(`Erreur ${res.status}`);
        return;
      }

      const result = await res.json();
      const newF: Formateur = {
        ...body,
        id: String(result.id),
        rating: 4.5,
        nbSessions: 0,
      };

      dispatch({ type: "ADD_FORMATEUR", payload: newF });

      if (data.specialite && !state.specialites.includes(data.specialite)) {
        dispatch({
          type: "SET_SPECIALITES",
          payload: [...state.specialites, data.specialite],
        });
      }

      sonnerToast.success("Formateur ajouté avec succès");
      closeModal();
    } catch (e) {
      console.error("❌ handleAddFormateur exception:", e);
      sonnerToast.error("Erreur lors de l'ajout");
    }
  };

  const handleUpdateFormateur = async (data: Formateur): Promise<void> => {
    const token = localStorage.getItem("access_token");
    const { id, rating, nbSessions, ...body } = data;

    try {
      const res = await fetch(`${API}/responsable/formateurs/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ Update formateur error:", res.status, errText);
        sonnerToast.error(`Erreur ${res.status}`);
        return;
      }

      dispatch({
        type: "UPDATE_FORMATEUR",
        payload: { ...body, id, rating, nbSessions },
      });

      if (data.specialite && !state.specialites.includes(data.specialite)) {
        dispatch({
          type: "SET_SPECIALITES",
          payload: [...state.specialites, data.specialite],
        });
      }

      sonnerToast.success("Formateur mis à jour");
      closeModal();
    } catch (e) {
      console.error("❌ handleUpdateFormateur exception:", e);
      sonnerToast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteFormateur = async (id: string) => {
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API}/responsable/formateurs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ Delete formateur error:", res.status, errText);
        sonnerToast.error(`Erreur ${res.status}`);
        return;
      }

      dispatch({ type: "DELETE_FORMATEUR", payload: id });
      sonnerToast.success("Formateur supprimé");
    } catch (e) {
      console.error("❌ handleDeleteFormateur exception:", e);
      sonnerToast.error("Erreur lors de la suppression");
    }
  };

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      formationsCount: state.formations.length,
      formateursCount: state.formateurs.length,
      avgRating:
        state.formateurs.length > 0
          ? (
              state.formateurs.reduce((acc, f) => acc + (f.rating || 0), 0) /
              state.formateurs.length
            ).toFixed(1)
          : "N/A",
      categoriesCount: state.categories.length,
    }),
    [state.formations, state.formateurs, state.categories],
  );

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
              type:
                state.activeTab === "formations" ? "formation" : "formateur",
              mode: "create",
              data: null,
            })
          }
          className="shadow-md btn-primary bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white border-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          {state.activeTab === "formations"
            ? "Nouvelle formation"
            : "Nouveau formateur"}
        </Button>
      </div>

      <Toolbar state={state} dispatch={dispatch} />

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm animate-pulse">
          Chargement des données...
        </div>
      ) : (
        <div className="relative mt-2">
          <div
            style={{
              display: state.activeTab === "formations" ? "block" : "none",
            }}
            aria-hidden={state.activeTab !== "formations"}
          >
            <FormationsTab
              state={state}
              dispatch={dispatch}
              onDelete={handleDeleteFormation}
              onEdit={(data) =>
                setModal({ type: "formation", mode: "edit", data })
              }
            />
          </div>
          <div
            style={{
              display: state.activeTab === "formateurs" ? "block" : "none",
            }}
            aria-hidden={state.activeTab !== "formateurs"}
          >
            <FormateursTab
              state={state}
              dispatch={dispatch}
              onDelete={handleDeleteFormateur}
              onEdit={(data) =>
                setModal({ type: "formateur", mode: "edit", data })
              }
            />
          </div>
        </div>
      )}

      <FormationFormModal
        isOpen={modal.type === "formation"}
        onOpenChange={(open) => !open && closeModal()}
        onSave={
          modal.mode === "create" ? handleAddFormation : handleUpdateFormation
        }
        editModeData={modal.data as Formation | undefined}
        categories={state.categories}
      />

      <FormateurFormModal
        isOpen={modal.type === "formateur"}
        onOpenChange={(open) => !open && closeModal()}
        onSave={
          modal.mode === "create" ? handleAddFormateur : handleUpdateFormateur
        }
        editModeData={modal.data as Formateur | undefined}
      />
    </div>
  );
}