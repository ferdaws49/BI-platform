"use client";

import { useMemo, useState, Dispatch } from "react";
import { Edit, Trash2, Monitor, Wifi, Calendar } from "lucide-react";
import { Formation, ResourcesAction, ResourcesState } from "../state";
import { Card, Badge } from "./ui";
import { ConfirmDialog, EmptyState } from "./shared";

// ─── Badges ───────────────────────────────────────────────────────────────────
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

// ─── Composant principal ───────────────────────────────────────────────────────
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

  const filteredData = useMemo(() => {
    return state.formations.filter((f) => {
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
  }, [state.formations, state.search, state.filters.formations]);

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
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">Intitulé</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">Catégorie</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">Type</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">Durée</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">Prix</th>
                {/* ✅ Colonne Sessions — nbSessions vient du backend */}
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">Sessions</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">Statut</th>
                <th className="px-6 py-4 font-semibold text-right text-muted-foreground uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  {/* Intitulé + description courte */}
                  <td className="px-6 py-5 max-w-[220px]">
                    <p className="font-medium text-foreground truncate">{f.titre}</p>
                    {f.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {f.description}
                      </p>
                    )}
                  </td>

                  {/* Catégorie */}
                  <td className="px-6 py-5">
                    <Badge
                      variant="secondary"
                      className="font-normal text-primary bg-primary/10 border-transparent rounded-full px-3"
                    >
                      {f.categorie}
                    </Badge>
                  </td>

                  {/* Type présentiel / en ligne */}
                  <td className="px-6 py-5">
                    <TypeBadge type={f.niveauType} />
                  </td>

                  {/* Durée */}
                  <td className="px-6 py-5 text-muted-foreground font-medium whitespace-nowrap">
                    {f.dureeHeures}h
                  </td>

                  {/* Prix — anciennement "Coût/session" */}
                  <td className="px-6 py-5 font-bold text-foreground whitespace-nowrap">
                    {(f.prix ?? 0).toLocaleString("fr-DZ")} DA
                  </td>

                  {/* Sessions — renvoyé par le backend via sessions.length */}
                  <td className="px-6 py-5">
                    {f.nbSessions !== undefined && f.nbSessions !== null ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{f.nbSessions}</span>
                        <span className="text-xs text-muted-foreground">
                          session{f.nbSessions !== 1 ? "s" : ""}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* Statut */}
                  <td className="px-6 py-5">
                    <StatutBadge statut={f.statut} />
                  </td>

                  {/* Actions */}
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
      </Card>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(v) => !v && setDeletingId(null)}
        title="Supprimer la formation ?"
        description="Cette action est irréversible."
        onConfirm={() => { if (deletingId) { onDelete(deletingId); setDeletingId(null); } }}
      />
    </div>
  );
}