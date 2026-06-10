"use client";

import { useMemo, useState, Dispatch } from "react";
import { Edit, Star, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Formateur, ResourcesAction, ResourcesState } from "../state";
import { Card } from "./ui";
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

export function FormateursTab({
  state,
  dispatch,
  onEdit,
  onDelete,
}: {
  state: ResourcesState;
  dispatch: Dispatch<ResourcesAction>;
  onEdit: (f: Formateur) => void;
  onDelete: (id: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filteredData = useMemo(() => {
    return state.formateurs.filter((f) => {
      const fullName = `${f.nom || ""} ${f.prenom || ""}`.toLowerCase();
      const email = (f.email || "").toLowerCase();
      const search = state.search.toLowerCase();
      const matchSearch = fullName.includes(search) || email.includes(search);
      const matchSpecialty =
        !state.filters.formateurs.specialite ||
        f.specialite === state.filters.formateurs.specialite;
      return matchSearch && matchSpecialty;
    });
  }, [state.formateurs, state.search, state.filters.formateurs.specialite]);

  // Reset page quand filtre/search change
  useMemo(() => {
    setPage(1);
  }, [state.search, state.filters.formateurs]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PER_PAGE));
  const paginated = filteredData.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (filteredData.length === 0) {
    return (
      <EmptyState
        title="Aucun formateur trouvé"
        description="Ajustez vos filtres de recherche."
      />
    );
  }

  return (
    <div className="fadeUp">
      <Card className="p-0 border-transparent shadow-sm overflow-hidden bg-card">
        <table className="w-full text-sm text-left">
          <thead className="bg-transparent border-b border-border">
            <tr>
              <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">
                Formateur
              </th>
              <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">
                Email
              </th>
              <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">
                Téléphone
              </th>
              <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">
                Spécialité
              </th>
              <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">
                Note
              </th>
              <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">
                Sessions
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
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#14b8a6] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {f.nom?.[0] || ""}
                      {f.prenom?.[0] || ""}
                    </div>
                    <p className="font-semibold text-foreground">
                      {f.nom} {f.prenom}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-5 text-muted-foreground">{f.email}</td>
                <td className="px-6 py-5 text-muted-foreground font-medium">
                  {f.telephone || "—"}
                </td>
                <td className="px-6 py-5 text-muted-foreground">
                  {f.specialite}
                </td>
                <td className="px-6 py-5">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    {f.rating?.toFixed(1) || "4.5"}
                  </span>
                </td>
                <td className="px-6 py-5 text-muted-foreground">
                  {f.nbSessions ?? 0}
                </td>
                <td className="px-6 py-5 text-right">
                  <button
                    onClick={() => onEdit(f)}
                    className="text-muted-foreground hover:text-primary mr-4 transition-colors"
                  >
                    <Edit className="h-4 w-4 inline" />
                  </button>
                  <button
                    onClick={() => setDeletingId(f.id)}
                    className="text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {filteredData.length} formateur
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
        title="Supprimer le formateur ?"
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
