"use client";

import { useMemo, useState, Dispatch } from "react";
import { toast } from "sonner";
import { Edit, Star, Trash2 } from "lucide-react";
import { Formateur, ResourcesAction, ResourcesState } from "../state";
import { Card, CardContent, Button } from "./ui";
import { ConfirmDialog, EmptyState } from "./shared";

export function FormateursTab({ state, dispatch, onEdit, onDelete }: { state: ResourcesState, dispatch: Dispatch<ResourcesAction>, onEdit: (f: Formateur) => void, onDelete: (id: string) => void }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    return state.formateurs.filter((f) => {
      const fullName = `${f.nom || ""} ${f.prenom || ""}`.toLowerCase();
      const email = (f.email || "").toLowerCase();
      const search = state.search.toLowerCase();
      const matchSearch = fullName.includes(search) || email.includes(search);
      const matchSpecialty = !state.filters.formateurs.specialite || f.specialite === state.filters.formateurs.specialite;
      return matchSearch && matchSpecialty;
    });
  }, [state.formateurs, state.search, state.filters.formateurs.specialite]);

  const handleDelete = () => {
    if (!deletingId) return;
    onDelete(deletingId);
    setDeletingId(null);
  };

  if (filteredData.length === 0) {
    return <EmptyState title="Aucun formateur trouvé" description="Ajustez vos filtres de recherche." />;
  }

  return (
    <div className="fadeUp">
      <Card className="p-0 border-transparent shadow-sm overflow-hidden bg-card">
        <table className="w-full text-sm text-left">
          <thead className="bg-transparent border-b border-border">
            <tr>
              <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">Formateur</th>
              <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">Email</th>
              <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">Téléphone</th>
              <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">Spécialité</th>
              <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">Note</th>
              <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs">Sessions</th>
              <th className="px-6 py-4 font-semibold text-right text-muted-foreground uppercase text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(f => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-5 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#14b8a6] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {f.nom?.[0] || ""}{f.prenom?.[0] || ""}
                    </div>
                    <p className="font-semibold text-foreground">{f.nom} {f.prenom}</p>
                  </td>
                  <td className="px-6 py-5 text-muted-foreground">{f.email}</td>
                  <td className="px-6 py-5 text-muted-foreground font-medium">{f.telephone || "-"}</td>
                  <td className="px-6 py-5 text-muted-foreground">{f.specialite}</td>
                  <td className="px-6 py-5 text-foreground flex items-center gap-1 font-medium"><Star className="h-4 w-4 fill-warning text-warning" /> {f.rating?.toFixed(1) || "4.5"}</td>
                <td className="px-6 py-5 text-muted-foreground">{f.nbSessions ?? 0}</td>
                <td className="px-6 py-5 text-right">
                  <button onClick={() => onEdit(f)} className="text-muted-foreground hover:text-primary mr-4 transition-colors"><Edit className="h-4 w-4 inline" /></button>
                  <button onClick={() => setDeletingId(f.id)} className="text-destructive hover:text-destructive/80 transition-colors"><Trash2 className="h-4 w-4 inline" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ConfirmDialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)} title="Supprimer le formateur ?" description="Cette action est irréversible." onConfirm={handleDelete} />
    </div>
  );
}
