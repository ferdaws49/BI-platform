"use client";

import { Dispatch } from "react";
import { ImportState, ImportAction } from "../state";
import { Button } from "./ui/Button";

export function StepConfig({ state, dispatch }: { state: ImportState; dispatch: Dispatch<ImportAction> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Configuration de l'import</h2>
        <p className="text-muted-foreground text-sm">Sélectionnez le type de données et le comportement en cas de conflits.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Type d'import</label>
          <select
            className="w-full flex h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            value={state.importType}
            onChange={(e) => dispatch({ type: "UPDATE_CONFIG", payload: { importType: e.target.value as any } })}
          >
            <option value="users">Utilisateurs</option>
            <option value="apprenant">Apprenants</option>
            <option value="formation">Formations</option>
            <option value="sessions">Sessions</option>
            <option value="finance">Finance</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Gestion des doublons (Duplicate Strategy)</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "ignore", label: "Ignorer", desc: "Sauter les lignes" },
              { id: "update", label: "Mettre à jour", desc: "Écraser l'existant" },
              { id: "error", label: "Bloquer", desc: "Marquer en erreur" },
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => dispatch({ type: "UPDATE_CONFIG", payload: { duplicateStrategy: opt.id as any } })}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  state.duplicateStrategy === opt.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                }`}
              >
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Relations manquantes (Relation Strategy)</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "create", label: "Créer", desc: "Créer automatiquement" },
              { id: "ignore", label: "Ignorer", desc: "Laisser vide" },
              { id: "error", label: "Bloquer", desc: "Marquer en erreur" },
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => dispatch({ type: "UPDATE_CONFIG", payload: { relationStrategy: opt.id as any } })}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  state.relationStrategy === opt.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                }`}
              >
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={() => dispatch({ type: "SET_STEP", payload: "upload" })}>
          Continuer
        </Button>
      </div>
    </div>
  );
}
