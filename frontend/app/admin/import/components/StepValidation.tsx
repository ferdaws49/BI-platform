"use client";

import { Dispatch, useEffect, useState } from "react";
import { ImportState, ImportAction } from "../state";
import { Button } from "./ui/Button";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export function StepValidation({ state, dispatch }: { state: ImportState; dispatch: Dispatch<ImportAction> }) {
  const [isValidating, setIsValidating] = useState(true);
  const [valid, setValid] = useState<any[]>([]);
  const [invalid, setInvalid] = useState<any[]>([]);

  useEffect(() => {
    const runValidation = () => {
      const validRows: any[] = [];
      const invalidRows: any[] = [];

      state.mappedData.forEach((row, i) => {
        const errors: string[] = [];
        const rowNum = row._rawIndex || i + 1;

        // 1. USERS VALIDATION
        if (state.importType === "users") {
          if (!row.nom) errors.push("Nom requis");
          if (!row.prenom) errors.push("Prénom requis");
          if (!row.email) {
            errors.push("Email requis");
          } else if (!row.email.includes("@")) {
            errors.push("Format email invalide");
          }
          if (!row.password) errors.push("Mot de passe requis");
          if (!row.role) errors.push("Rôle requis");
        }

        // 2. APPRENANT VALIDATION
        if (state.importType === "apprenant") {
          if (!row.nom) errors.push("Nom requis");
          if (!row.prenom) errors.push("Prénom requis");
          if (!row.email) {
            errors.push("Email requis");
          } else if (!row.email.includes("@")) {
            errors.push("Format email invalide");
          }
        }

        // 3. FORMATION VALIDATION
        if (state.importType === "formation") {
          if (!row.titre) errors.push("Titre requis");
          if (row.prix === undefined || row.prix === "") {
            errors.push("Prix requis");
          } else if (isNaN(Number(row.prix))) {
            errors.push("Le prix doit être un nombre");
          }
        }

        // 4. SESSIONS VALIDATION
        if (state.importType === "sessions") {
          if (!row.date) errors.push("Date requise");
          if (!row.heureDebut) errors.push("Heure début requise");
          if (!row.heureFin) errors.push("Heure fin requise");
          if (row.heureDebut && row.heureFin && row.heureDebut >= row.heureFin) {
            errors.push("L'heure de début doit être avant l'heure de fin");
          }
          if (!row.formationId) errors.push("ID Formation requis");
        }

        // 5. FINANCE VALIDATION
        if (state.importType === "finance") {
          if (row.montant === undefined || row.montant === "") {
            errors.push("Montant requis");
          } else if (isNaN(Number(row.montant))) {
            errors.push("Le montant doit être un nombre");
          }
          
          const allowedTypes = ["paiement", "depense", "impaye", "remboursement"];
          if (!row.type) {
            errors.push("Type requis");
          } else if (!allowedTypes.includes(row.type.toLowerCase())) {
            errors.push(`Type invalide. Attendu: ${allowedTypes.join(", ")}`);
          }
        }

        if (errors.length > 0) {
          invalidRows.push({ rowNumber: rowNum, data: row, errors });
        } else {
          validRows.push(row);
        }
      });

      setValid(validRows);
      setInvalid(invalidRows);
      setIsValidating(false);
    };

    runValidation();
  }, [state.mappedData, state.importType]);

  const handleContinue = () => {
    dispatch({ type: "SET_VALIDATION_RESULT", payload: { validData: valid, invalidData: invalid } });
  };

  if (isValidating) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
        <p className="mt-4 text-sm font-medium">Validation en cours...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Résultats de validation</h2>
        <p className="text-muted-foreground text-sm">Vérification des règles métiers avant importation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center p-4 rounded-xl border bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-8 w-8 mr-4" />
          <div>
            <div className="text-2xl font-bold">{valid.length}</div>
            <div className="text-sm font-medium">Lignes valides</div>
          </div>
        </div>
        <div className="flex items-center p-4 rounded-xl border bg-rose-50 text-rose-700">
          <XCircle className="h-8 w-8 mr-4" />
          <div>
            <div className="text-2xl font-bold">{invalid.length}</div>
            <div className="text-sm font-medium">Lignes en erreur</div>
          </div>
        </div>
      </div>

      {invalid.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            Détails des erreurs
          </h3>
          <div className="rounded-xl border divide-y overflow-hidden max-h-64 overflow-y-auto bg-card">
            {invalid.map((rowError: any, idx) => (
              <div key={idx} className="p-3 text-sm flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-muted/50">
                <div className="font-medium min-w-[80px]">Ligne {rowError.rowNumber}</div>
                <div className="flex-1 text-rose-600">
                  {rowError.errors.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={() => dispatch({ type: "SET_STEP", payload: "mapping" })}>
          Retour
        </Button>
        <Button 
          onClick={handleContinue} 
          disabled={valid.length === 0}
          className={invalid.length > 0 ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
        >
          {invalid.length > 0 ? "Ignorer les erreurs et continuer" : "Continuer"}
        </Button>
      </div>
    </div>
  );
}
