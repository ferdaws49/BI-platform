"use client";

import { Dispatch, useState } from "react";
import { ImportState, ImportAction } from "../state";
import { Button } from "./ui/Button";
import { AlertCircle, Loader2 } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";

const API = "http://localhost:5000";

export function StepPreview({
  state,
  dispatch,
}: {
  state: ImportState;
  dispatch: Dispatch<ImportAction>;
}) {
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewRows = state.validData.slice(0, 5);
  const previewCols =
    previewRows.length > 0
      ? Object.keys(previewRows[0]).filter((k) => k !== "_rawIndex")
      : [];

  const handleConfirmImport = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");

      // ✅ Appel direct au backend NestJS (pas de /api/import Next.js)
      // ✅ Authorization header ajouté (requis par JwtAuthGuard)
      // ✅ filePath envoyé pour le tracking dans ImportJob
      const response = await fetch(`${API}/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: state.importType,
          data: state.validData,
          duplicateStrategy: state.duplicateStrategy,
          relationStrategy: state.relationStrategy,
          filePath: state.file?.name ?? "", // ✅ ajouté — optionnel mais attendu par le back
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Erreur serveur" }));
        // NestJS renvoie { message, statusCode, error } pour les BadRequestException
        throw new Error(
          errorData.message ?? errorData.error ?? "Échec de l'importation",
        );
      }

      const result = await response.json();
      
      console.log("[StepPreview] Import réussi, déclenchement notification...");
      // ✅ Ajouter une notification globale
      addNotification(
        "Importation Terminée",
        `L'importation de type ${state.importType} est finie : ${result.importedRows} lignes importées, ${result.errorCount} erreurs.`,
        result.errorCount > 0 ? "warning" : "success",
        "imports"
      );

      dispatch({ 
        type: "SET_IMPORT_RESULT", 
        payload: {
          totalRows: result.totalRows,
          importedRows: result.importedRows,
          errorCount: result.errorCount,
        } 
      });
    } catch (err: any) {
      addNotification("Erreur d'importation", err.message || "Échec de l'envoi", "error", "imports");
      setError(
        err.message || "Une erreur est survenue lors de l'envoi des données.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Aperçu avant import</h2>
        <p className="text-muted-foreground text-sm">
          Vérifiez les données qui seront insérées dans la base de données.
        </p>
      </div>

      <div className="flex gap-4 text-sm font-medium">
        <div className="text-emerald-600">
          ✔ {state.validData.length} lignes à importer
        </div>
        {state.invalidData.length > 0 && (
          <div className="text-amber-600">
            ⚠ {state.invalidData.length} lignes ignorées
          </div>
        )}
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              {previewCols.map((col) => (
                <th key={col} className="px-4 py-3 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {previewRows.length === 0 ? (
              <tr>
                <td
                  colSpan={previewCols.length || 1}
                  className="py-8 text-center text-muted-foreground"
                >
                  Aucune ligne valide à afficher.
                </td>
              </tr>
            ) : (
              previewRows.map((row, idx) => (
                <tr
                  key={idx}
                  className="bg-card hover:bg-muted/50 transition-colors"
                >
                  {previewCols.map((col) => (
                    <td key={col} className="px-4 py-3 truncate max-w-[200px]">
                      {/* ✅ Affichage propre des booleans */}
                      {typeof row[col] === "boolean"
                        ? row[col]
                          ? "Oui"
                          : "Non"
                        : row[col]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
        {state.validData.length > 5 && (
          <div className="bg-muted/30 p-2 text-center text-xs text-muted-foreground border-t">
            + {state.validData.length - 5} autres lignes
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-lg text-sm border border-rose-100">
          <AlertCircle className="h-4 w-4" />
          <span>{error}. Veuillez contacter le support technique.</span>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="ghost"
          onClick={() => dispatch({ type: "SET_STEP", payload: "validation" })}
          disabled={loading}
        >
          Retour
        </Button>
        <Button
          onClick={handleConfirmImport}
          disabled={state.validData.length === 0 || loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importation...
            </>
          ) : (
            "Confirmer l'importation"
          )}
        </Button>
      </div>
    </div>
  );
}
