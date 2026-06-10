"use client";

import { useMemo, useState, Dispatch } from "react";
import {
  Edit,
  Trash2,
  Monitor,
  Wifi,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Formation, ResourcesAction, ResourcesState } from "../state";
import { Card, Badge } from "./ui";
import { ConfirmDialog, EmptyState } from "./shared";

const PER_PAGE = 8;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  const pages: (number | "...")[] = [];
  let prev: number | null = null;
  for (let i = 1; i <= total; i++) {
    const inRange =
      i === 1 || i === total || (i >= current - 1 && i <= current + 1);
    if (inRange) {
      if (prev !== null && i - prev > 1) pages.push("...");
      pages.push(i);
      prev = i;
    }
  }
  return pages;
}

function TypeBadge({ type }: { type?: Formation["niveauType"] }) {
  if (type === "en_ligne") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
        <Wifi className="h-3 w-3" /> En ligne
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
      <Monitor className="h-3 w-3" /> Présentiel
    </span>
  );
}

function StatutBadge({ statut }: { statut?: Formation["statut"] }) {
  if (statut === "completed") {
    return (
      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
        Terminée
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
      Active
    </span>
  );
}

export function FormationsTab({
  state,
  dispatch,
  onEdit,
  onDelete,
}: {
  state: ResourcesState;
  dispatch: Dispatch<ResourcesAction>;
  onEdit: (f: Formation) => void;
  onDelete: (id: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filteredData = useMemo(() => {
    const result = state.formations.filter((f) => {
      const matchSearch = (f.titre || "")
        .toLowerCase()
        .includes(state.search.toLowerCase());
      const matchCategory =
        !state.filters.formations.categorie ||
        f.categorie === state.filters.formations.categorie;
      const matchStatut =
        !state.filters.formations.statut ||
        f.statut === state.filters.formations.statut;
      return matchSearch && matchCategory && matchStatut;
    });
    // Reset page si filtre change et page dépasse
    return result;
  }, [state.formations, state.search, state.filters.formations]);

  // Reset page quand filtre/search change
  useMemo(() => {
    setPage(1);
  }, [state.search, state.filters.formations]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PER_PAGE));
  const paginated = filteredData.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (filteredData.length === 0) {
    return (
      <EmptyState
        title="Aucune formation trouvée"
        description="Ajustez vos filtres ou créez une nouvelle formation."
      />
    );
  }

  return (
    <div className="fadeUp">
      <Card className="p-0 border-transparent shadow-sm overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-transparent border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">
                  Intitulé
                </th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">
                  Catégorie
                </th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">
                  Type
                </th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">
                  Durée
                </th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">
                  Prix
                </th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">
                  Sessions
                </th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">
                  Statut
                </th>
                <th className="px-6 py-4 font-semibold text-right text-muted-foreground uppercase text-xs">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-6 py-5 max-w-[220px]">
                    <p className="font-medium text-foreground truncate">
                      {f.titre}
                    </p>
                    {f.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {f.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <Badge
                      variant="secondary"
                      className="font-normal text-primary bg-primary/10 border-transparent rounded-full px-3"
                    >
                      {f.categorie}
                    </Badge>
                  </td>
                  <td className="px-6 py-5">
                    <TypeBadge type={f.niveauType} />
                  </td>
                  <td className="px-6 py-5 text-muted-foreground font-medium whitespace-nowrap">
                    {f.dureeHeures ? (
                      (() => {
                        const h = Math.floor(f.dureeHeures);
                        const m = Math.round((f.dureeHeures - h) * 60);
                        return m > 0 ? `${h}h ${m}min` : `${h}h`;
                      })()
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-6 py-5 font-bold text-foreground whitespace-nowrap">
                    {(f.prix ?? 0).toLocaleString("fr-DZ")} DA
                  </td>
                  <td className="px-6 py-5">
                    {f.nbSessions !== undefined && f.nbSessions !== null ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold text-foreground">
                          {f.nbSessions}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          session{f.nbSessions !== 1 ? "s" : ""}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <StatutBadge statut={f.statut} />
                  </td>
                  <td className="px-6 py-5 text-right whitespace-nowrap">
                    <button
                      onClick={() => onEdit(f)}
                      className="text-muted-foreground hover:text-primary mr-4 transition-colors"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4 inline" />
                    </button>
                    <button
                      onClick={() => setDeletingId(f.id)}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {filteredData.length} formation
              {filteredData.length > 1 ? "s" : ""} — page {page} sur{" "}
              {totalPages}
            </span>
            <div className="flex gap-1 items-center">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border
                           text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={14} />
              </button>

              {getPageNumbers(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span
                    key={`dot-${i}`}
                    className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-8 h-8 text-xs rounded-lg border transition font-semibold ${
                      page === p
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border
                           text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(v) => !v && setDeletingId(null)}
        title="Supprimer la formation ?"
        description="Cette action est irréversible."
        onConfirm={() => {
          if (deletingId) {
            onDelete(deletingId);
            setDeletingId(null);
          }
        }}
      />
    </div>
  );
}
