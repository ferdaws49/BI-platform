"use client";
import type { FilterOptions } from "@/context/FilterContext";

const PERIODES = ["Ce mois", "Trimestre", "Semestre", "Année"];
const FORMATIONS = [
  "Tous",
  "Data Science Avancée",
  "Développement Full-Stack",
  "UX/UI Design",
  "Cloud & DevOps",
  "Intelligence Artificielle",
  "Cybersécurité",
];
const FORMATEURS = [
  "Tous",
  "Marie D.",
  "Jean M.",
  "Sophie L.",
  "Pierre M.",
  "Claire B.",
];
const TYPES = ["Tous", "En ligne", "Présentiel"];
const STATUTS = ["Tous", "Actif", "Terminé", "Annulé"];

export default function AdvancedFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  onReset: () => void;
}) {
  const handleChange = (key: keyof FilterOptions, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.formation !== "Tous" ||
    filters.formateur !== "Tous" ||
    filters.type !== "Tous" ||
    filters.statut !== "Tous";

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl shadow-sm">
      {/* Période — tabs */}
      <div className="flex rounded-lg border border-green-100 bg-green-50 p-0.5 gap-0.5">
        {PERIODES.map((p) => (
          <button
            key={p}
            onClick={() => handleChange("periode", p)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              filters.periode === p
                ? "bg-white text-green-700 shadow-sm"
                : "text-gray-600 hover:text-green-700"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Formation */}
      <select
        className="rounded-lg border border-green-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-300"
        value={filters.formation}
        onChange={(e) => handleChange("formation", e.target.value)}
      >
        {FORMATIONS.map((f) => (
          <option key={f}>{f}</option>
        ))}
      </select>

      {/* Formateur */}
      <select
        className="rounded-lg border border-green-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-300"
        value={filters.formateur}
        onChange={(e) => handleChange("formateur", e.target.value)}
      >
        {FORMATEURS.map((f) => (
          <option key={f}>{f}</option>
        ))}
      </select>

      {/* Type */}
      <select
        className="rounded-lg border border-green-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-300"
        value={filters.type}
        onChange={(e) => handleChange("type", e.target.value)}
      >
        {TYPES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>

      {/* Statut — boutons */}
      <div className="flex items-center gap-1">
        {STATUTS.map((s) => (
          <button
            key={s}
            onClick={() => handleChange("statut", s)}
            className={`px-3 py-1 rounded-xl text-xs transition-all duration-200 ${
              filters.statut === s
                ? "bg-green-600 text-white shadow-sm scale-105"
                : "bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
        >
          ✕ Réinitialiser
        </button>
      )}
    </div>
  );
}
