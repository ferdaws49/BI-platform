"use client";

import { useState, useEffect, useMemo } from "react";
import { AlertApprenant } from "./components/types";
import { STATIC_ALERTS } from "./components/data";
import { StatsSummary } from "./components/StatsSummary";
import { FilterBar } from "./components/FilterBar";
import { AlertCard } from "./components/AlertCard";
import { Bell } from "lucide-react";

export default function AlertsPage() {
  const [data, setData] = useState<AlertApprenant[]>(STATIC_ALERTS);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState("Tous");
  const [filterFormation, setFilterFormation] = useState("Toutes");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "nom">("score");

  // Fetch API
  useEffect(() => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    fetch("http://localhost:5000/responsable/alerts", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => { if (res.ok) return res.json(); throw new Error(); })
      .then(json => setData(json))
      .catch(() => {/* keep static data */})
      .finally(() => setLoading(false));
  }, []);

  // Stats
  const stats = useMemo(() => ({
    critique: data.filter(a => a.riskLevel === "critique").length,
    eleve: data.filter(a => a.riskLevel === "eleve").length,
    modere: data.filter(a => a.riskLevel === "modere").length,
    faible: data.filter(a => a.riskLevel === "faible").length,
  }), [data]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...data];
    if (filterLevel !== "Tous") list = list.filter(a => a.riskLevel === filterLevel);
    if (filterFormation !== "Toutes") list = list.filter(a => a.formation === filterFormation);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(a =>
        `${a.prenom} ${a.nom}`.toLowerCase().includes(s) ||
        a.formation.toLowerCase().includes(s)
      );
    }
    if (sortBy === "score") list.sort((a, b) => b.riskScore - a.riskScore);
    else list.sort((a, b) => a.nom.localeCompare(b.nom));
    return list;
  }, [data, filterLevel, filterFormation, search, sortBy]);

  const activeFilters = [filterLevel !== "Tous", filterFormation !== "Toutes", search.trim() !== ""].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Bell size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Alertes — Risque d'abandon
              </h1>
              <p className="text-sm text-muted-foreground">
                Analyse prédictive basée sur la présence, les notes et l'engagement
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <StatsSummary stats={stats} />

        {/* Filters */}
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          filterLevel={filterLevel}
          onFilterLevelChange={setFilterLevel}
          filterFormation={filterFormation}
          onFilterFormationChange={setFilterFormation}
          sortBy={sortBy}
          onSortChange={setSortBy}
          activeFilters={activeFilters}
          onReset={() => { setFilterLevel("Tous"); setFilterFormation("Toutes"); setSearch(""); }}
        />

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm">Analyse des données en cours...</p>
          </div>
        )}

        {/* List Content */}
        {!loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {filtered.length} apprenant{filtered.length > 1 ? "s" : ""} à surveiller
              </p>
              {activeFilters > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                  Filtres actifs
                </span>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-card rounded-3xl border border-dashed border-border text-center">
                <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-4 text-2xl">
                  ✓
                </div>
                <h3 className="text-lg font-bold text-foreground">Tout est sous contrôle</h3>
                <p className="text-sm text-muted-foreground">
                  Aucun apprenant ne correspond aux critères d'alerte actuels.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map(a => (
                  <AlertCard
                    key={a.id}
                    apprenant={a}
                    expanded={expandedId === a.id}
                    onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}