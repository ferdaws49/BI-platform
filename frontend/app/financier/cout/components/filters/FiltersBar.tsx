"use client";

import { SlidersHorizontal } from "lucide-react";
import { FilterSelect, glassPanel } from "../ui";
import type { PeriodeFilter, RemplissageFilter, NiveauCout } from "../../types";

export interface FiltersState {
  periode: PeriodeFilter;
  dateDebut: string;
  dateFin: string;
  formateurId: string | number;
  formationId: string | number;
  rentabilite: string;
  remplissage: RemplissageFilter;
  niveauCout: NiveauCout;
  search?: string;
  page?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface Props {
  filters: FiltersState;
  onChange: (f: FiltersState) => void;
  formations: { id: number; title: string }[];
  formateurs: { id: number; nom: string }[];
}

const PERIODES: PeriodeFilter[] = ["Mois", "Trimestre", "Année", "Personnalisé"];

export default function FiltersBar({ filters, onChange, formations, formateurs }: Props) {
  const set = <K extends keyof FiltersState>(key: K, val: FiltersState[K]) =>
    onChange({ ...filters, [key]: val, page: 1 }); // reset page on filter change

  const showDates = filters.periode === "Personnalisé";

  return (
    <div className="rounded-2xl p-4" style={glassPanel}>
      {/* Row 1 — période + dates + formateur + formation */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Icône filtre */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(26,113,73,0.1)" }}
        >
          <SlidersHorizontal size={15} color="#1a7149" />
        </div>

        {/* Période pills */}
        <div className="flex gap-1">
          {PERIODES.map(p => (
            <button
              key={p}
              onClick={() => set("periode", p)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={
                filters.periode === p
                  ? { background: "#1a7149", color: "#fff" }
                  : { background: "#efefea", color: "#2d4a3e" }
              }
            >
              {p}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {showDates && (
          <>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
              style={{ background: "#efefea", borderColor: "#e5eadd" }}
            >
              <span className="text-xs" style={{ color: "#2d4a3e", opacity: 0.5 }}>Du</span>
              <input
                type="date"
                value={filters.dateDebut}
                onChange={e => set("dateDebut", e.target.value)}
                className="bg-transparent text-xs outline-none"
                style={{ color: "#2d4a3e", fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
              style={{ background: "#efefea", borderColor: "#e5eadd" }}
            >
              <span className="text-xs" style={{ color: "#2d4a3e", opacity: 0.5 }}>Au</span>
              <input
                type="date"
                value={filters.dateFin}
                onChange={e => set("dateFin", e.target.value)}
                className="bg-transparent text-xs outline-none"
                style={{ color: "#2d4a3e", fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
          </>
        )}

        {/* Séparateur */}
        <div className="w-px h-5 mx-1" style={{ background: "#e5eadd" }} />

        <FilterSelect
          label="Formateur :"
          value={String(filters.formateurId)}
          onChange={v => set("formateurId", v === "all" ? "all" : Number(v))}
          options={[
            { label: "Tous", value: "all" },
            ...formateurs.map(f => ({ label: f.nom, value: String(f.id) })),
          ]}
        />

        <FilterSelect
          label="Formation :"
          value={String(filters.formationId)}
          onChange={v => set("formationId", v === "all" ? "all" : Number(v))}
          options={[
            { label: "Toutes", value: "all" },
            ...formations.map(f => ({ label: f.title.split(" ")[0], value: String(f.id) })),
          ]}
        />
      </div>

      {/* Row 2 — filtres analytiques */}
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid #e5eadd" }}>
        <span className="text-xs font-medium" style={{ color: "#2d4a3e", opacity: 0.45 }}>
          Filtres analytiques :
        </span>

        <FilterSelect
          label="Rentabilité :"
          value={filters.rentabilite}
          onChange={v => set("rentabilite", v)}
          options={[
            { label: "Tous", value: "all" },
            { label: "🟢 Rentable",         value: "rentable" },
            { label: "🟡 Seuil atteint",    value: "seuil" },
            { label: "🔴 Déficitaire",       value: "deficitaire" },
          ]}
        />

        <FilterSelect
          label="Remplissage :"
          value={filters.remplissage}
          onChange={v => set("remplissage", v as RemplissageFilter)}
          options={[
            { label: "Tous",      value: "all" },
            { label: "🔴 < 50%",  value: "low" },
            { label: "🟡 50–70%", value: "mid" },
            { label: "🟢 > 70%",  value: "high" },
          ]}
        />

        <FilterSelect
          label="Niveau de coût :"
          value={filters.niveauCout}
          onChange={v => set("niveauCout", v as NiveauCout)}
          options={[
            { label: "Tous",           value: "all" },
            { label: "Petit (< 3 000)", value: "petit" },
            { label: "Moyen (3–5 000)", value: "moyen" },
            { label: "Élevé (> 5 000)", value: "eleve" },
          ]}
        />

        {/* Reset */}
        <button
          onClick={() =>
            onChange({
              periode: "Année", dateDebut: "", dateFin: "",
              formateurId: "all", formationId: "all",
              rentabilite: "all", remplissage: "all", niveauCout: "all",
              page: 1, sortOrder: "desc", sortBy: "cout"
            })
          }
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:bg-white"
          style={{ borderColor: "#e5eadd", color: "#2d4a3e", opacity: 0.6 }}
        >
          ↺ Réinitialiser
        </button>
      </div>
    </div>
  );
}
