"use client";

import { Dispatch } from "react";
import { ImportAction } from "../state";
import { Button } from "./ui/Button";
import { CheckCircle2 } from "lucide-react";

export function StepDone({ dispatch }: { dispatch: Dispatch<ImportAction> }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
      <div className="rounded-full bg-success/10 p-6 text-success">
        <CheckCircle2 className="h-16 w-16" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">Importation réussie</h2>
        <p className="text-muted-foreground">Les données ont été insérées avec succès dans la base de données PostgreSQL (Mock).</p>
      </div>

      <div className="pt-8">
        <Button onClick={() => dispatch({ type: "RESET" })} size="lg">
          Nouvel import
        </Button>
      </div>
    </div>
  );
}
