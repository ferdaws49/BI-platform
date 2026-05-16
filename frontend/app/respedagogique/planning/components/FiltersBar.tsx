"use client";

import { FilterOptions, Formation, Formateur } from "../constants";

interface FiltersBarProps {
  filters: FilterOptions;
  setFilters: (f: FilterOptions) => void;
  formations: Formation[];
  formateurs: Formateur[];
  activeFiltersCount: number;
  onReset: () => void;
}

export function FiltersBar({
  filters,
  setFilters,
  formations,
  formateurs,
  activeFiltersCount,
  onReset,
}: FiltersBarProps) {
  const set = (key: keyof FilterOptions, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Statut */}
        <select
          value={filters.statut}
          onChange={(e) => set("statut", e.target.value)}
          className="rounded-xl border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="Actif">Actif</option>
          <option value="Terminé">Terminé</option>
          <option value="Annulé">Annulé</option>
        </select>

        {/* Formation */}
        <select
          value={filters.formation}
          onChange={(e) => set("formation", e.target.value)}
          className="rounded-xl border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="">Toutes les formations</option>
          {formations.map((f) => (
            <option key={f.id} value={f.id}>
              {f.titre}
            </option>
          ))}
        </select>

        {/* Formateur */}
        <select
          value={filters.formateur}
          onChange={(e) => set("formateur", e.target.value)}
          className="rounded-xl border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="">Tous les formateurs</option>
          {formateurs.map((f) => (
            <option key={f.id} value={f.id}>
              {f.prenom} {f.nom}
            </option>
          ))}
        </select>

        {/* Période */}
        <select
          value={filters.periode}
          onChange={(e) => set("periode", e.target.value)}
          className="rounded-xl border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="">Toute période</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="year">Cette année</option>
        </select>
      </div>

      {activeFiltersCount > 0 && (
        <button
          onClick={onReset}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap px-2"
        >
          Réinitialiser ({activeFiltersCount})
        </button>
      )}
    </div>
  );
}
