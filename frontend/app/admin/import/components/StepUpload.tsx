"use client";

import { Dispatch, useState } from "react";
import { UploadCloud, File, AlertCircle } from "lucide-react";
import { ImportState, ImportAction } from "../state";
import { Button } from "./ui/Button";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export function StepUpload({ state, dispatch }: { state: ImportState; dispatch: Dispatch<ImportAction> }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: globalThis.File) => {
    setLoading(true);
    setError(null);

    const isCSV = file.name.endsWith(".csv");
    const isExcel = file.name.match(/\.xlsx?$/);

    if (!isCSV && !isExcel) {
      setError("Seuls les fichiers CSV ou Excel sont acceptés.");
      setLoading(false);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Le fichier dépasse 10 Mo.");
      setLoading(false);
      return;
    }

    try {
      if (isCSV) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            dispatch({ type: "SET_FILE", payload: { file, parsedData: results.data } });
            setLoading(false);
          },
          error: (err) => {
            setError(`Erreur lors de la lecture du CSV: ${err.message}`);
            setLoading(false);
          },
        });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          dispatch({ type: "SET_FILE", payload: { file, parsedData: json } });
          setLoading(false);
        };
        reader.onerror = () => {
          setError("Erreur lors de la lecture du fichier Excel.");
          setLoading(false);
        };
        reader.readAsBinaryString(file);
      }
    } catch (err: any) {
      setError(`Une erreur est survenue: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Télécharger votre fichier</h2>
        <p className="text-muted-foreground text-sm">Sélectionnez un fichier .csv ou .xlsx depuis votre ordinateur.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
        className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-300 ${
          isDragActive ? "scale-[1.02] border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        } ${loading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="rounded-full bg-primary/10 p-4 mb-4 text-primary group-hover:scale-110 transition-transform">
          <UploadCloud className="h-8 w-8" />
        </div>
        <h3 className="mb-1 text-lg font-medium text-foreground">
          {loading ? "Lecture en cours..." : "Glissez vos fichiers ici"}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">ou cliquez pour parcourir</p>
        
        <Button 
          variant="outline" 
          onClick={() => document.getElementById("file-upload")?.click()}
          disabled={loading}
        >
          {loading ? "Chargement..." : "Parcourir les fichiers"}
        </Button>
        <input
          id="file-upload"
          type="file"
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
            e.target.value = "";
          }}
        />
        
        <div className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <File className="h-3.5 w-3.5" />
          CSV / XLSX / XLS · Max 10 Mo
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={() => dispatch({ type: "SET_STEP", payload: "config" })} disabled={loading}>
          Retour
        </Button>
      </div>
    </div>
  );
}
