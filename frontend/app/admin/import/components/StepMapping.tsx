"use client";

import { Dispatch, useState, useEffect } from "react";
import { ImportState, ImportAction } from "../state";
import { Button } from "./ui/Button";
import { AlertCircle } from "lucide-react";

// DB fields per import type aligned with backend entities
const DB_SCHEMAS: Record<string, { key: string; label: string; required: boolean }[]> = {
  users: [
    { key: "nom", label: "Nom", required: true },
    { key: "prenom", label: "Prénom", required: true },
    { key: "email", label: "Email", required: true },
    { key: "password", label: "Mot de passe", required: true },
    { key: "role", label: "Rôle", required: true },
    { key: "phone", label: "Téléphone", required: false },
  ],
  apprenant: [
    { key: "nom", label: "Nom", required: true },
    { key: "prenom", label: "Prénom", required: true },
    { key: "email", label: "Email", required: true },
    { key: "telephone", label: "Téléphone", required: false },
  ],
  formation: [
    { key: "titre", label: "Titre", required: true },
    { key: "description", label: "Description", required: false },
    { key: "categorie", label: "Catégorie", required: false },
    { key: "dureeHeures", label: "Durée (Heures)", required: false },
    { key: "prix", label: "Prix", required: true },
  ],
  sessions: [
    { key: "date", label: "Date", required: true },
    { key: "heureDebut", label: "Heure Début", required: true },
    { key: "heureFin", label: "Heure Fin", required: true },
    { key: "formationId", label: "ID Formation", required: true },
    { key: "formateurId", label: "ID Formateur", required: false },
    { key: "lieu", label: "Lieu", required: false },
  ],
  finance: [
    { key: "montant", label: "Montant", required: true },
    { key: "type", label: "Type", required: true }, // paiement | depense | impaye | remboursement
    { key: "formationId", label: "ID Formation", required: false },
    { key: "description", label: "Description", required: false },
  ],
};

export function StepMapping({ state, dispatch }: { state: ImportState; dispatch: Dispatch<ImportAction> }) {
  const csvColumns = state.parsedData.length > 0 ? Object.keys(state.parsedData[0]) : [];
  const dbFields = DB_SCHEMAS[state.importType] || [];

  const [localMapping, setLocalMapping] = useState<Record<string, string>>(
    state.mapping || {}
  );
  
  // ── Auto-Mapping Logic ──────────────────────────────────────────────
  // Attempt to automatically match CSV columns with database fields based on name similarity.
  useEffect(() => {
    if (Object.keys(localMapping).length === 0 && csvColumns.length > 0) {
      const autoMap: Record<string, string> = {};
      csvColumns.forEach(c => {
        // Try various normalization techniques to find a match
        const dbMatch = dbFields.find(db => 
          db.key.toLowerCase() === c.toLowerCase().replace(/[\s_]/g, '') || 
          db.label.toLowerCase() === c.toLowerCase() ||
          c.toLowerCase().includes(db.key.toLowerCase())
        );
        if (dbMatch) autoMap[c] = dbMatch.key;
      });
      setLocalMapping(autoMap);
      dispatch({ type: "UPDATE_MAPPING", payload: autoMap });
    }
  }, [csvColumns.length]);

  const requiredFieldsMissing = dbFields
    .filter((f) => f.required)
    .some((f) => !Object.values(localMapping).includes(f.key));

  const handleMappingChange = (csvCol: string, dbKey: string) => {
    const newMapping = { ...localMapping };
    if (!dbKey) {
      delete newMapping[csvCol];
    } else {
      newMapping[csvCol] = dbKey;
    }
    setLocalMapping(newMapping);
    dispatch({ type: "UPDATE_MAPPING", payload: newMapping });
  };

  /**
   * Finalizes the mapping and transforms the raw parsed data into the target schema.
   */
  const submitMapping = () => {
    const transformed = state.parsedData.map((row, index) => {
      const newRow: any = {};
      Object.keys(row).forEach((csvCol) => {
        const dbKey = localMapping[csvCol];
        if (dbKey) {
          // Map the value from the CSV column to the database key
          newRow[dbKey] = row[csvCol];
        }
      });
      // Keep track of original row index for error reporting in validation step
      newRow._rawIndex = index + 1;
      return newRow;
    });

    dispatch({ type: "SET_MAPPED_DATA", payload: transformed });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Mappage des colonnes</h2>
        <p className="text-muted-foreground text-sm">Associez les colonnes de votre fichier aux champs de la base de données.</p>
      </div>

      {requiredFieldsMissing && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm">
          <AlertCircle className="h-5 w-5" />
          <span>Veuillez associer tous les champs obligatoires (*) avant de continuer.</span>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Colonne Fichier</th>
              <th className="px-4 py-3 font-medium">Extrait</th>
              <th className="px-4 py-3 font-medium">Champ Base de Données</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {csvColumns.map((col) => {
              const sample = state.parsedData[0]?.[col];
              return (
                <tr key={col} className="bg-card hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{col}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{sample}</td>
                  <td className="px-4 py-3">
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={localMapping[col] || ""}
                      onChange={(e) => handleMappingChange(col, e.target.value)}
                    >
                      <option value="">-- Ignorer --</option>
                      {dbFields.map((df) => (
                        <option key={df.key} value={df.key}>
                          {df.label} {df.required ? "(*)" : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={() => dispatch({ type: "SET_STEP", payload: "upload" })}>
          Retour
        </Button>
        <Button onClick={submitMapping} disabled={requiredFieldsMissing}>
          Continuer
        </Button>
      </div>
    </div>
  );
}
