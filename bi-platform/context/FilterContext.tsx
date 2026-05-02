"use client";

import { createContext, useContext, useState } from "react";

// Ce type décrit la structure des filtres partagés dans le dashboard.
export type FilterOptions = {
  periode: string;
  formation: string;
  formateur: string;
  type: string;
  statut: string;
};

// Valeurs par défaut utilisées au premier affichage
// et lorsqu'on réinitialise les filtres.
export const defaultFilters: FilterOptions = {
  periode: "Ce mois",
  formation: "Tous",
  formateur: "Tous",
  type: "Tous",
  statut: "Tous",
};

// Le contexte permet de partager les filtres entre plusieurs composants
// sans devoir passer les props manuellement à chaque niveau.
const FilterContext = createContext<{
  filters: FilterOptions;
  setFilters: (f: FilterOptions) => void;
  resetFilters: () => void;
}>({
  filters: defaultFilters,
  setFilters: () => {},
  resetFilters: () => {},
});

export function FilterProvider({ children }: { children: React.ReactNode }) {
  // useState conserve les filtres en mémoire dans le Provider.
  // Quand setFilters est appelé, les composants qui lisent ce contexte
  // reçoivent les nouvelles valeurs.
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);

  // Fonction pratique pour remettre tous les filtres à leur état initial.
  const resetFilters = () => setFilters(defaultFilters);

  return (
    // Le Provider rend filters, setFilters et resetFilters
    // accessibles à tous les composants enfants.
    <FilterContext.Provider value={{ filters, setFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

// Hook personnalisé pour utiliser le contexte plus facilement dans les pages
// et composants, par exemple : const { filters } = useFilters().
export const useFilters = () => useContext(FilterContext);
