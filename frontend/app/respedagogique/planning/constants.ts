export const API_URL = "http://localhost:5000";

export const STATUS_MAP_TO_FR: Record<string, string> = {
  // Version minuscules
  active: "Actif",
  completed: "Terminé",
  cancelled: "Annulé",
  // Version majuscules
  Active: "Actif",
  Completed: "Terminé",
  Cancelled: "Annulé",
  // Sécurité si déjà en français
  Actif: "Actif",
  Terminé: "Terminé",
  Annulé: "Annulé",
};

export type Session = {
  id: string;
  date: string;           // "YYYY-MM-DD"
  heureDebut: string;     // "HH:mm"
  heureFin: string;       // "HH:mm"
  formation: string;      // titre
  formationId: number;
  formateur: string;      // "prenom nom" ou ""
  formateurId: number | null;
  statut: "Actif" | "Terminé" | "Annulé";
  lieu: string | null;
  type: "présentiel" | "en_ligne";
  capacite: number | null;
  prix: number | null;    // prix spécifique session (null = fallback formation)
  prixEffectif: number;   // prix réellement appliqué (avec fallback)
  revenue: number;        // prixEffectif × apprenants.length
  apprenants?: Apprenant[];
};

export type Apprenant = {
  id: number;
  nom: string;
  prenom: string;
  email?: string | null;
};

export type Formateur = {
  id: number;
  nom: string;
  prenom: string;
  specialite?: string | null;
};

export type Formation = {
  id: number;
  titre: string;
  description?: string | null;
  categorie?: string | null;
  dureeHeures?: number | null;
  prix: number;
  statut: "active" | "completed";
  revenue?: number;
};

export type FilterOptions = {
  periode: string;
  formation: string;
  formateur: string;
  statut: string;
};

type RawSession = Omit<Session, "statut"> & {
  statut: string;
};

export function normalizeSession(raw: RawSession): Session {
  return {
    ...raw,
    statut: (STATUS_MAP_TO_FR[raw.statut] || raw.statut) as Session["statut"],
  };
}
