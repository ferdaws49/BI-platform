"use client";

import { Dispatch, useEffect, useState } from "react";
import { ImportState, ImportAction, FieldSchema } from "../state";
import { Button } from "./ui/Button";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export function StepValidation({
  state,
  dispatch,
}: {
  state: ImportState;
  dispatch: Dispatch<ImportAction>;
}) {
  const [isValidating, setIsValidating] = useState(false);
  const [valid, setValid] = useState<any[]>([]);
  const [invalid, setInvalid] = useState<any[]>([]);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    // ✅ Guard : attend que mappedData ET entityFields soient disponibles
    // Cas courant du bug : le composant monte avant que le state soit flush
    if (state.mappedData.length === 0 || state.entityFields.length === 0)
      return;

    setIsValidating(true);
    setHasRun(false);

    // ✅ setTimeout 50ms : laisse React finir son flush avant de bloquer le thread
    // Sans ça, le composant s'affiche avec isValidating=true mais sans spinner visible
    const timer = setTimeout(() => {
      const validRows: any[] = [];
      const invalidRows: any[] = [];

      state.mappedData.forEach((row, i) => {
        const errors: string[] = [];
        const rowNum = row._rawIndex || i + 1;

        // ── 1. Validation dynamique depuis entityFields (reçus du back) ───────
        state.entityFields.forEach((field: FieldSchema) => {
          const value = row[field.key];
          const isEmpty =
            value === undefined ||
            value === null ||
            String(value).trim() === "";

          // Champ requis manquant
          if (field.required && isEmpty) {
            errors.push(`${field.label} requis`);
            return;
          }

          // Champ non mappé + non requis → skip, pas d'erreur
          if (isEmpty) return;

          // Validation email
          if (field.type === "email" || field.key === "email") {
            if (!String(value).includes("@") || !String(value).includes(".")) {
              errors.push(`Format email invalide (${field.label})`);
            }
          }

          // Validation nombre
          if (field.type === "number") {
            if (isNaN(Number(value))) {
              errors.push(`${field.label} doit être un nombre`);
            }
          }

          // Validation date
          if (field.type === "date") {
            if (isNaN(Date.parse(String(value)))) {
              errors.push(`${field.label} : format de date invalide`);
            }
          }

          // Validation heure HH:MM
          if (field.type === "time") {
            if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(String(value).trim())) {
              errors.push(`${field.label} : format invalide (HH:MM attendu)`);
            }
          }

          // Validation enum — insensible à la casse
          if (field.type === "enum" && field.enumValues?.length) {
            const normalized = String(value).trim().toLowerCase();
            const allowed = field.enumValues.map((v) => v.toLowerCase());
            if (!allowed.includes(normalized)) {
              errors.push(
                `${field.label} invalide. Valeurs acceptées : ${field.enumValues.join(", ")}`,
              );
            }
          }

          // Validation boolean
          if (field.type === "boolean") {
            const v = String(value).trim().toLowerCase();
            if (!["true", "false", "1", "0", "oui", "non"].includes(v)) {
              errors.push(`${field.label} doit être vrai ou faux`);
            }
          }
        });

        // ── 2. Règles métier cross-champs (ne peuvent pas être dynamiques) ────
        if (state.importType === "sessions") {
          if (
            row.heureDebut &&
            row.heureFin &&
            row.heureDebut >= row.heureFin
          ) {
            errors.push("L'heure de début doit être avant l'heure de fin");
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
      setHasRun(true);
    }, 50);

    return () => clearTimeout(timer);
  }, [state.mappedData, state.entityFields, state.importType]);

  const handleContinue = () => {
    dispatch({
      type: "SET_VALIDATION_RESULT",
      payload: { validData: valid, invalidData: invalid },
    });
  };

  // ── Spinner : en cours de validation ──────────────────────────────────────
  if (isValidating || (!hasRun && state.mappedData.length > 0)) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        <p className="text-sm font-medium text-muted-foreground">
          Validation de {state.mappedData.length} lignes en cours...
        </p>
      </div>
    );
  }

  // ── Guard : mappedData vide après mount (ne devrait pas arriver) ──────────
  if (state.mappedData.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground text-sm">
        <p>Aucune donnée à valider. Retournez à l'étape de mapping.</p>
        <Button
          variant="ghost"
          onClick={() => dispatch({ type: "SET_STEP", payload: "mapping" })}
        >
          Retour au mapping
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Résultats de validation</h2>
        <p className="text-muted-foreground text-sm">
          Vérification des règles métiers sur{" "}
          <span className="font-medium text-foreground">
            {state.mappedData.length} lignes
          </span>{" "}
          avant importation.
        </p>
      </div>

      {/* ── Compteurs ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center p-4 rounded-xl border bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-8 w-8 mr-4 shrink-0" />
          <div>
            <div className="text-2xl font-bold">{valid.length}</div>
            <div className="text-sm font-medium">Lignes valides</div>
          </div>
        </div>
        <div className="flex items-center p-4 rounded-xl border bg-rose-50 text-rose-700">
          <XCircle className="h-8 w-8 mr-4 shrink-0" />
          <div>
            <div className="text-2xl font-bold">{invalid.length}</div>
            <div className="text-sm font-medium">Lignes en erreur</div>
          </div>
        </div>
      </div>

      {/* ── Détail erreurs ─────────────────────────────────────────────────── */}
      {invalid.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            Détails des erreurs ({invalid.length} ligne
            {invalid.length > 1 ? "s" : ""})
          </h3>
          <div className="rounded-xl border divide-y overflow-hidden max-h-64 overflow-y-auto bg-card">
            {invalid.map((rowError: any, idx) => (
              <div
                key={idx}
                className="p-3 text-sm flex flex-col sm:flex-row sm:items-start gap-2 hover:bg-muted/50"
              >
                <div className="font-medium min-w-[80px] text-foreground">
                  Ligne {rowError.rowNumber}
                </div>
                <ul className="flex-1 list-disc list-inside space-y-0.5">
                  {rowError.errors.map((err: string, eIdx: number) => (
                    <li key={eIdx} className="text-rose-600">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="ghost"
          onClick={() => dispatch({ type: "SET_STEP", payload: "mapping" })}
        >
          Retour
        </Button>
        <Button
          onClick={handleContinue}
          disabled={valid.length === 0}
          className={
            invalid.length > 0
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : ""
          }
        >
          {invalid.length > 0
            ? `Ignorer ${invalid.length} erreur${invalid.length > 1 ? "s" : ""} et continuer`
            : "Continuer"}
        </Button>
      </div>
    </div>
  );
}
