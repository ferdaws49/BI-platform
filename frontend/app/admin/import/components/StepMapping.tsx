"use client";

import { Dispatch, useState, useEffect } from "react";
import { ImportState, ImportAction } from "../state";
import { Button } from "./ui/Button";
import { AlertCircle } from "lucide-react";

export function StepMapping({
  state,
  dispatch,
}: {
  state: ImportState;
  dispatch: Dispatch<ImportAction>;
}) {
  const csvColumns =
    state.parsedData.length > 0 ? Object.keys(state.parsedData[0]) : [];

  // Les fields viennent du back via state.entityFields — zéro hardcode
  const dbFields = state.entityFields;

  const [localMapping, setLocalMapping] = useState<Record<string, string>>(
    state.mapping || {},
  );

  // ── Auto-mapping sans doublons ────────────────────────────────────────────
  useEffect(() => {
    if (
      Object.keys(localMapping).length === 0 &&
      csvColumns.length > 0 &&
      dbFields.length > 0
    ) {
      const autoMap: Record<string, string> = {};
      const usedDbKeys = new Set<string>();

      csvColumns.forEach((col) => {
        const normalizedCol = col.toLowerCase().replace(/[\s_-]/g, "");

        const dbMatch = dbFields.find((db) => {
          if (usedDbKeys.has(db.key)) return false;

          const normalizedKey = db.key.toLowerCase().replace(/[\s_-]/g, "");
          const normalizedLabel = db.label.toLowerCase().replace(/[\s_-]/g, "");

          return (
            normalizedKey === normalizedCol ||
            normalizedLabel === normalizedCol ||
            (normalizedCol.includes(normalizedKey) && normalizedKey.length > 3)
          );
        });

        if (dbMatch) {
          autoMap[col] = dbMatch.key;
          usedDbKeys.add(dbMatch.key);
        }
      });

      setLocalMapping(autoMap);
      dispatch({ type: "UPDATE_MAPPING", payload: autoMap });
    }
  }, [csvColumns.length, dbFields.length]);

  // ── Validations ───────────────────────────────────────────────────────────
  const requiredFieldsMissing = dbFields
    .filter((f) => f.required)
    .some((f) => !Object.values(localMapping).includes(f.key));

  const dbValueCounts = Object.values(localMapping).reduce<
    Record<string, number>
  >((acc, key) => {
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const hasDuplicateMapping = Object.values(dbValueCounts).some((c) => c > 1);

  const handleMappingChange = (csvCol: string, dbKey: string) => {
    const newMapping = { ...localMapping };
    if (!dbKey) delete newMapping[csvCol];
    else newMapping[csvCol] = dbKey;
    setLocalMapping(newMapping);
    dispatch({ type: "UPDATE_MAPPING", payload: newMapping });
  };

  const submitMapping = () => {
    const transformed = state.parsedData.map((row, index) => {
      const newRow: Record<string, any> = {};
      Object.keys(row).forEach((csvCol) => {
        const dbKey = localMapping[csvCol];
        if (dbKey) newRow[dbKey] = row[csvCol];
      });
      newRow._rawIndex = index + 1;
      return newRow;
    });

    // ✅ FIX DU BUG PRINCIPAL :
    // Avant : SET_MAPPED_DATA changeait le step → "validation" dans le même dispatch.
    // StepValidation montait avant que React flush mappedData dans le state,
    // donc useEffect tournait sur un tableau vide → 0 erreur détectée.
    //
    // Fix : on sépare en 2 dispatches distincts.
    // 1. D'abord on stocke les données transformées (sans changer de step)
    // 2. Ensuite on navigue vers "validation" dans un setTimeout,
    //    après que React ait eu le temps de flush le state.
    dispatch({ type: "SET_MAPPED_DATA_ONLY", payload: transformed });

    setTimeout(() => {
      dispatch({ type: "SET_STEP", payload: "validation" });
    }, 0);
  };

  // Guard : si entityFields vide
  if (dbFields.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground text-sm">
        <AlertCircle className="h-6 w-6" />
        <p>
          Impossible de charger les champs de l'entité. Retournez à l'étape
          précédente.
        </p>
        <Button
          variant="ghost"
          onClick={() => dispatch({ type: "SET_STEP", payload: "config" })}
        >
          Retour à la configuration
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Mappage des colonnes</h2>
        <p className="text-muted-foreground text-sm">
          Associez les colonnes de votre fichier aux champs de la base de
          données.
        </p>
      </div>

      {requiredFieldsMissing && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>
            Veuillez associer tous les champs obligatoires (*) avant de
            continuer.
          </span>
        </div>
      )}

      {hasDuplicateMapping && (
        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-200 p-4 rounded-xl text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>
            Deux colonnes pointent vers le même champ DB. Chaque champ doit être
            unique.
          </span>
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
              const selectedDbKey = localMapping[col] || "";
              const isDuplicate =
                !!selectedDbKey && dbValueCounts[selectedDbKey] > 1;

              return (
                <tr
                  key={col}
                  className="bg-card hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{col}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                    {sample}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={`w-full h-9 rounded-md border px-3 py-1 text-sm bg-background transition-colors ${
                        isDuplicate
                          ? "border-rose-400 ring-1 ring-rose-400"
                          : "border-input"
                      }`}
                      value={selectedDbKey}
                      onChange={(e) => handleMappingChange(col, e.target.value)}
                    >
                      <option value="">-- Ignorer --</option>
                      {dbFields.map((df) => (
                        <option key={df.key} value={df.key}>
                          {df.label} {df.required ? "(*)" : ""}
                          {df.type === "enum" && df.enumValues
                            ? ` [${df.enumValues.join(", ")}]`
                            : ""}
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
        <Button
          variant="ghost"
          onClick={() => dispatch({ type: "SET_STEP", payload: "upload" })}
        >
          Retour
        </Button>
        <Button
          onClick={submitMapping}
          disabled={requiredFieldsMissing || hasDuplicateMapping}
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}
