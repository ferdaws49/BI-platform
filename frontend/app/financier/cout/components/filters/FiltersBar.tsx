"use client";

import { SlidersHorizontal } from "lucide-react";
import { FilterSelect } from "../ui";
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
  formations?: { id: number; title: string }[];  // ← optionnel
  formateurs?: { id: number; nom: string }[];     // ← optionnel
}



const PERIODES: PeriodeFilter[] = ["Mois", "Trimestre", "Année", "Personnalisé"];
export default function FiltersBar({ filters, onChange, formations, formateurs }: Props) {
  const safeFormations = Array.isArray(formations) ? formations : [];
  const safeFormateurs = Array.isArray(formateurs) ? formateurs : [];
  const set = <K extends keyof FiltersState>(key: K, val: FiltersState[K]) =>
    onChange({ ...filters, [key]: val, page: 1 }); // reset page on filter change

  const showDates = filters.periode === "Personnalisé";

  return (
    <div className="rounded-xl border border-border bg-card p-2 shadow-sm space-y-3">
      {/* Row 1 — période + dates + formateur + formation */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Icône filtre */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
          <SlidersHorizontal size={15} className="text-primary" />
        </div>

        {/* Période pills */}
        <div className="flex gap-1">
          {PERIODES.map(p => (
            <button
              key={p}
              onClick={() => set("periode", p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                filters.periode === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-accent/20"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {showDates && (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-secondary">
              <span className="text-xs text-muted-foreground">Du</span>
              <input
                type="date"
                value={filters.dateDebut}
                onChange={e => set("dateDebut", e.target.value)}
                className="bg-transparent text-xs outline-none text-foreground"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-secondary">
              <span className="text-xs text-muted-foreground">Au</span>
              <input
                type="date"
                value={filters.dateFin}
                onChange={e => set("dateFin", e.target.value)}
                className="bg-transparent text-xs outline-none text-foreground"
              />
            </div>
          </>
        )}

        {/* Séparateur */}
        <div className="w-px h-5 mx-1 bg-border" />

        <FilterSelect
    label="Formateur :"
    value={String(filters.formateurId)}
    onChange={v => set("formateurId", v === "all" ? "all" : Number(v))}
    options={[
      { label: "Tous", value: "all" },
      ...safeFormateurs.map(f => ({  // ← utilise safeFormateurs
        label: f.nom, 
        value: String(f.id) 
      })),
    ]}
  />

        <FilterSelect
    label="Formation :"
    value={String(filters.formationId)}
    onChange={v => set("formationId", v === "all" ? "all" : Number(v))}
    options={[
      { label: "Toutes", value: "all" },
      ...safeFormations.map(f => ({  // ← utilise safeFormations
        label: f.title.split(" ")[0], 
        value: String(f.id) 
      })),
    ]}
  />
      </div>

      {/* Row 2 — filtres analytiques */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
        <span className="text-xs font-medium text-muted-foreground">
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
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground transition-all hover:bg-accent/20"
        >
          ↺ Réinitialiser
        </button>
      </div>
    </div>
  );
}
