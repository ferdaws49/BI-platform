"use client";

import { Dispatch } from "react";
import { ImportState, ImportAction } from "../state";
import { Button } from "./ui/Button";
import { CheckCircle2, AlertCircle, ListChecks } from "lucide-react";

export function StepDone({ 
  state, 
  dispatch 
}: { 
  state: ImportState;
  dispatch: Dispatch<ImportAction> 
}) {
  const result = state.importResult;

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center space-y-6 max-w-md mx-auto">
      <div className="rounded-full bg-success/10 p-6 text-success">
        <CheckCircle2 className="h-16 w-16" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">Importation terminée</h2>
        <p className="text-muted-foreground text-sm">
          Le processus d'intégration des données est terminé.
        </p>
      </div>

      {result && (
        <div className="w-full bg-muted/30 rounded-xl p-6 space-y-4 border border-border/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ListChecks className="h-4 w-4" />
              <span>Total lignes traitées</span>
            </div>
            <span className="font-bold">{result.totalRows}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span>Lignes importées</span>
            </div>
            <span className="font-bold text-success">{result.importedRows}</span>
          </div>

          {result.errorCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-rose-500">
                <AlertCircle className="h-4 w-4" />
                <span>Lignes en erreur</span>
              </div>
              <span className="font-bold text-rose-500">{result.errorCount}</span>
            </div>
          )}
        </div>
      )}

      <div className="pt-4">
        <Button onClick={() => dispatch({ type: "RESET" })} size="lg" className="px-8">
          Nouvel import
        </Button>
      </div>
    </div>
  );
}
