"use client";

import { useMemo } from "react";
import { BoxSelect } from "lucide-react";
import { Formateur } from "../state";
import { Dialog, DialogTitle, DialogFooter, Button } from "./ui";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-border bg-secondary/50 fadeUp">
      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4">
        <BoxSelect className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, onConfirm }: { open: boolean, onOpenChange: (v: boolean) => void, title: string, description: string, onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle>{title}</DialogTitle>
      <p className="text-muted-foreground text-sm">{description}</p>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
        <Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false); }}>Supprimer</Button>
      </DialogFooter>
    </Dialog>
  );
}

export function AvatarStack({ formateurIds, allFormateurs, limit = 3 }: { formateurIds: string[], allFormateurs: Formateur[], limit?: number }) {
  const formateurs = useMemo(() => {
    return formateurIds.map(id => allFormateurs.find(f => f.id === id)).filter((f): f is Formateur => !!f);
  }, [formateurIds, allFormateurs]);

  if (formateurs.length === 0) return null;

  const visible = formateurs.slice(0, limit);
  const overflow = formateurs.length - limit;

  return (
    <div className="flex -space-x-2 overflow-hidden mt-1">
      {visible.map((frm) => (
        <div key={frm.id} title={`${frm.nom} ${frm.prenom}`} className="inline-flex h-8 w-8 rounded-full ring-2 ring-background bg-primary/20 items-center justify-center text-xs font-bold text-primary">
          {frm.nom[0]}{frm.prenom[0]}
        </div>
      ))}
      {overflow > 0 && (
        <div className="inline-flex h-8 w-8 rounded-full ring-2 ring-background bg-secondary items-center justify-center text-xs font-bold text-muted-foreground">
          +{overflow}
        </div>
      )}
    </div>
  );
}
