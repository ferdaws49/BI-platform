"use client";

import { Dispatch, useState, useEffect } from "react";
import { ImportState, ImportAction, FieldSchema } from "../state";
import { Button } from "./ui/Button";
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  Banknote,
  ClipboardList,
  FileText,
  BookMarked,
  Loader2,
  AlertCircle,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const API = "http://localhost:5000";

// ─── Types — miroir exact du backend EntityConfigDto ─────────────────────────
interface EntityConfig {
  key: string;
  label: string;
  description: string;
  icon: string;
  fields: FieldSchema[];
  totalImports: number;
  lastImport: string | null;
  lastStatus: "pending" | "processing" | "done" | "failed" | null;
}

// ✅ BookMarked ajouté — correspond à l'icône de l'entité "apprenants" dans entity-metadata.ts
const ICON_MAP: Record<string, LucideIcon> = {
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  Banknote,
  ClipboardList,
  FileText,
  BookMarked, // ✅ manquait — "apprenants" utilise cette icône côté back
};

const STATUS_STYLES: Record<string, string> = {
  done: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  processing: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS: Record<string, string> = {
  done: "Réussi",
  failed: "Échoué",
  processing: "En cours",
  pending: "En attente",
};

// ─── Hook fetch ──────────────────────────────────────────────────────────────
function useEntities() {
  const [entities, setEntities] = useState<EntityConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntities = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/import/entities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Erreur serveur : ${res.status}`);
      const data: { entities: EntityConfig[] } = await res.json();
      setEntities(data.entities);
    } catch (err: any) {
      setError(err.message ?? "Impossible de charger les types d'import.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  return { entities, loading, error, refetch: fetchEntities };
}

// ─── Composant ───────────────────────────────────────────────────────────────
export function StepConfig({
  state,
  dispatch,
}: {
  state: ImportState;
  dispatch: Dispatch<ImportAction>;
}) {
  const { entities, loading, error, refetch } = useEntities();

  // Quand les entités sont chargées → sélectionne la première si rien de sélectionné
  useEffect(() => {
    if (entities.length > 0 && !state.importType) {
      const first = entities[0];
      dispatch({ type: "UPDATE_CONFIG", payload: { importType: first.key } });
      dispatch({ type: "SET_ENTITY_FIELDS", payload: first.fields });
    }
  }, [entities]);

  const handleSelectEntity = (entity: EntityConfig) => {
    dispatch({ type: "UPDATE_CONFIG", payload: { importType: entity.key } });
    // Envoie les fields du back dans le state → utilisés par StepMapping + StepValidation
    dispatch({ type: "SET_ENTITY_FIELDS", payload: entity.fields });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">
          Configuration de l'import
        </h2>
        <p className="text-muted-foreground text-sm">
          Sélectionnez le type de données et le comportement en cas de conflits.
        </p>
      </div>

      {/* ── Sélecteur entité ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-sm font-medium block">Type d'import</label>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des entités disponibles…
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 p-4 rounded-xl">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={refetch}
              className="flex items-center gap-1 text-xs font-medium underline"
            >
              <RefreshCw className="h-3 w-3" /> Réessayer
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {entities.map((entity) => {
              const Icon = ICON_MAP[entity.icon] ?? FileText;
              const isSelected = state.importType === entity.key;

              return (
                <button
                  key={entity.key}
                  type="button"
                  onClick={() => handleSelectEntity(entity)}
                  className={`text-left rounded-xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`rounded-lg p-2 transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm">{entity.label}</span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-snug mb-2">
                    {entity.description}
                  </p>

                  {/* Champs requis — viennent du back */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {entity.fields
                      .filter((f) => f.required)
                      .map((f) => (
                        <span
                          key={f.key}
                          className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono"
                        >
                          {f.key}
                        </span>
                      ))}
                  </div>

                  {/* Stats live */}
                  <div className="border-t pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {entity.totalImports === 0
                        ? "Jamais importé"
                        : `${entity.totalImports} import${entity.totalImports > 1 ? "s" : ""}`}
                      {entity.lastImport && (
                        <span className="ml-1">
                          ·{" "}
                          {formatDistanceToNow(new Date(entity.lastImport), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      )}
                    </span>
                    {entity.lastStatus && (
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLES[entity.lastStatus] ?? ""}`}
                      >
                        {STATUS_LABELS[entity.lastStatus] ?? entity.lastStatus}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Doublons ──────────────────────────────────────────────────────── */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Gestion des doublons
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: "ignore",
              label: "Ignorer",
              desc: "Sauter les lignes en doublon",
            },
            {
              id: "update",
              label: "Mettre à jour",
              desc: "Écraser les données existantes",
            },
            {
              id: "error",
              label: "Bloquer",
              desc: "Marquer en erreur et stopper",
            },
          ].map((opt) => (
            <div
              key={opt.id}
              onClick={() =>
                dispatch({
                  type: "UPDATE_CONFIG",
                  payload: { duplicateStrategy: opt.id as any },
                })
              }
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                state.duplicateStrategy === opt.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:border-primary/50"
              }`}
            >
              <div className="font-medium text-sm">{opt.label}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {opt.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Relations ─────────────────────────────────────────────────────── */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Relations manquantes
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "create", label: "Créer", desc: "Créer automatiquement" },
            { id: "ignore", label: "Ignorer", desc: "Laisser le champ vide" },
            { id: "error", label: "Bloquer", desc: "Marquer en erreur" },
          ].map((opt) => (
            <div
              key={opt.id}
              onClick={() =>
                dispatch({
                  type: "UPDATE_CONFIG",
                  payload: { relationStrategy: opt.id as any },
                })
              }
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                state.relationStrategy === opt.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:border-primary/50"
              }`}
            >
              <div className="font-medium text-sm">{opt.label}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {opt.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={() => dispatch({ type: "SET_STEP", payload: "upload" })}
          disabled={loading || !!error || !state.importType}
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}
