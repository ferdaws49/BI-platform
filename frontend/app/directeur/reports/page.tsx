"use client";

import { useState, useEffect } from "react";

import StrategicReportPage from "@/app/directeur/reports/components/StrategicReportPage";

const defaultFilters = {
  periode: "Trimestre",
  formation: "Tous",
  formateur: "Tous",
  type: "Tous",
  statut: "Tous",
};

const PERIODES = ["Trimestre", "Semestre", "Année"];
const TYPES = ["Tous", "Présentiel", "En ligne"];
const STATUTS = ["Tous", "Actif", "Terminé", "Annulé"];

export default function DirecteurReportsPage() {
  const [filters, setFilters] = useState(defaultFilters);
  const [options, setOptions] = useState<{ formations: string[]; formateurs: string[] }>({
    formations: ["Tous"],
    formateurs: ["Tous"],
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch("http://localhost:5000/responsable/dashboard/filters/options", {
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
      }
    };
    fetchOptions();
  }, []);


  return (
    <div className="space-y-6">
      {/* Filtres */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Période */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Période
            </label>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={filters.periode}
              onChange={(e) =>
                setFilters((f) => ({ ...f, periode: e.target.value }))
              }
            >
              {PERIODES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Formation */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Formation
            </label>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[200px]"
              value={filters.formation}
              onChange={(e) =>
                setFilters((f) => ({ ...f, formation: e.target.value }))
              }
            >
              {options.formations.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Formateur */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Formateur
            </label>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[150px]"
              value={filters.formateur}
              onChange={(e) =>
                setFilters((f) => ({ ...f, formateur: e.target.value }))
              }
            >
              {options.formateurs.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>


          {/* Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Type
            </label>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={filters.type}
              onChange={(e) =>
                setFilters((f) => ({ ...f, type: e.target.value }))
              }
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Statut */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Statut
            </label>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={filters.statut}
              onChange={(e) =>
                setFilters((f) => ({ ...f, statut: e.target.value }))
              }
            >
              {STATUTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Reset */}
          <button
            onClick={() => setFilters(defaultFilters)}
            className="ml-auto text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-white hover:bg-slate-50 transition"
          >
            Réinitialiser
          </button>
        </div>
      </section>

      <StrategicReportPage filters={filters} />
    </div>
  );
}
