"use client";
import { useState, useEffect } from "react";
import type { FilterOptions } from "@/context/FilterContext";

const PERIODES = ["Ce mois", "Trimestre", "Semestre", "Année"];
const TYPES = ["Tous", "En ligne", "Présentiel"];
const STATUTS = ["Tous", "Actif", "Terminé", "Annulé"];

const API_URL = "http://localhost:5000";

export default function AdvancedFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  onReset: () => void;
}) {
  const [options, setOptions] = useState<{
    formations: string[];
    formateurs: string[];
  }>({
    formations: ["Tous"],
    formateurs: ["Tous"],
  });

  const [loading, setLoading] = useState(true);

  // ── Fetch options depuis le backend ──────────────────────────────────────────
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_URL}/responsable/dashboard/filters/options`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setOptions({
            formations: data.formations || ["Tous"],
            formateurs: data.formateurs || ["Tous"],
          });
        }
      } catch (err) {
        console.error("Erreur fetch filter options:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, []);

  const handleChange = (key: keyof FilterOptions, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.formation !== "Tous" ||
    filters.formateur !== "Tous" ||
    filters.type !== "Tous" ||
    filters.statut !== "Tous";

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-green-100 shadow-sm">
      {/* Période — tabs */}
      <div className="flex rounded-lg border border-green-50 bg-green-50/50 p-0.5 gap-0.5">
        {PERIODES.map((p) => (
          <button
            key={p}
            onClick={() => handleChange("periode", p)}
            className={`rounded-md px-3 py-1 text-[11px] font-medium transition-all ${
              filters.periode === p
                ? "bg-white text-green-700 shadow-sm"
                : "text-gray-500 hover:text-green-700"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Formation */}
      <select
        disabled={loading}
        className="max-w-[180px] rounded-lg border border-green-100 bg-white px-2 py-1.5 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-300 disabled:opacity-50 truncate"
        value={filters.formation}
        onChange={(e) => handleChange("formation", e.target.value)}
      >
        {options.formations.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      {/* Formateur */}
      <select
        disabled={loading}
        className="max-w-[150px] rounded-lg border border-green-100 bg-white px-2 py-1.5 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-300 disabled:opacity-50 truncate"
        value={filters.formateur}
        onChange={(e) => handleChange("formateur", e.target.value)}
      >
        {options.formateurs.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      {/* Type */}
      <select
        className="max-w-[120px] rounded-lg border border-green-100 bg-white px-2 py-1.5 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-300 truncate"
        value={filters.type}
        onChange={(e) => handleChange("type", e.target.value)}
      >
        {TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* Statut — boutons */}
      <div className="flex items-center gap-1.5">
        {STATUTS.map((s) => (
          <button
            key={s}
            onClick={() => handleChange("statut", s)}
            className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
              filters.statut === s
                ? "bg-green-600 text-white shadow-sm"
                : "bg-gray-50 text-gray-500 hover:bg-green-50"
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
          className="ml-1 text-[11px] font-bold text-red-500 hover:text-red-600 px-1"
          title="Réinitialiser"
        >
          ✕
        </button>
      )}
    </div>
  );
}
