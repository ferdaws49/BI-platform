"use client";

export type Formateur = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  specialite: string;
  telephone?: string;
  rating?: number;
  nbSessions?: number;
};

export type Formation = {
  id: string;
  titre: string;
  categorie: string;
  description: string;
  dureeHeures: number;
  prix: number;
  niveauType: "présentiel" | "en_ligne";
  statut: "active" | "completed";
  nbSessions?: number;
};

export type ResourcesState = {
  activeTab: "formations" | "formateurs";
  formations: Formation[];
  formateurs: Formateur[];
  categories: string[];    // ← من formations في DB
  specialites: string[];   // ← من formateurs في DB
  search: string;
  filters: {
    formations: { categorie?: string; statut?: string };
    formateurs: { specialite?: string };
  };
  viewMode: "grid" | "table";
};

export const initialResourcesState: ResourcesState = {
  activeTab: "formations",
  search: "",
  viewMode: "table",
  filters: { formations: {}, formateurs: {} },
  formateurs: [],
  formations: [],
  categories: [],
  specialites: [],
};

export type ResourcesAction =
  | { type: "SET_TAB"; payload: "formations" | "formateurs" }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_FILTER"; payload: { tab: "formations" | "formateurs"; key: string; value: string | undefined } }
  | { type: "SET_VIEW_MODE"; payload: "grid" | "table" }
  | { type: "SET_CATEGORIES"; payload: string[] }
  | { type: "SET_SPECIALITES"; payload: string[] }   // ← جديد
  | { type: "ADD_FORMATION"; payload: Formation }
  | { type: "UPDATE_FORMATION"; payload: Formation }
  | { type: "DELETE_FORMATION"; payload: string }
  | { type: "SET_FORMATIONS"; payload: Formation[] }
  | { type: "ADD_FORMATEUR"; payload: Formateur }
  | { type: "UPDATE_FORMATEUR"; payload: Formateur }
  | { type: "DELETE_FORMATEUR"; payload: string }
  | { type: "SET_FORMATEURS"; payload: Formateur[] };

export function resourcesReducer(state: ResourcesState, action: ResourcesAction): ResourcesState {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.payload, search: "" };
    case "SET_SEARCH":
      return { ...state, search: action.payload };
    case "SET_FILTER":
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.tab]: {
            ...state.filters[action.payload.tab],
            [action.payload.key]: action.payload.value,
          },
        },
      };
    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.payload };
    case "SET_CATEGORIES":
      return { ...state, categories: action.payload };
    case "SET_SPECIALITES":
      return { ...state, specialites: action.payload };
    case "ADD_FORMATION":
      return { ...state, formations: [...state.formations, action.payload] };
    case "UPDATE_FORMATION":
      return {
        ...state,
        formations: state.formations.map((f) => f.id === action.payload.id ? action.payload : f),
      };
    case "DELETE_FORMATION":
      return { ...state, formations: state.formations.filter((f) => f.id !== action.payload) };
    case "SET_FORMATIONS":
      return { ...state, formations: action.payload };
    case "ADD_FORMATEUR":
      return { ...state, formateurs: [...state.formateurs, action.payload] };
    case "UPDATE_FORMATEUR":
      return {
        ...state,
        formateurs: state.formateurs.map((f) => f.id === action.payload.id ? action.payload : f),
      };
    case "DELETE_FORMATEUR":
      return { ...state, formateurs: state.formateurs.filter((f) => f.id !== action.payload) };
    case "SET_FORMATEURS":
      return { ...state, formateurs: action.payload };
    default:
      return state;
  }
}