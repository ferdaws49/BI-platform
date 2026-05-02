"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Formation } from "../state";
import {
  Dialog,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Textarea,
  SelectNative,
  Button,
} from "./ui";
import { ChevronDown } from "lucide-react";

// ─── Schéma Zod ───────────────────────────────────────────────────────────────
// ✅ Fix : z.coerce s'occupe de la conversion string→number
//          donc PAS besoin de valueAsNumber: true dans register()
const formationSchema = z.object({
  titre:       z.string().min(2, "Titre requis (min 2 caractères)"),
  categorie:   z.string().min(1, "Catégorie requise"),
  description: z.string().min(5, "Description trop courte (min 5 caractères)"),
  dureeHeures: z.coerce.number().int("Doit être un entier").positive("Durée requise"),
  prix:        z.coerce.number().positive("Prix requis"),
  niveauType:  z.enum(["présentiel", "en_ligne"]),
  statut:      z.enum(["active", "completed"]),
});

type FormationValues = z.infer<typeof formationSchema>;

// ─── Autocomplete catégorie ───────────────────────────────────────────────────
function CategorieInput({
  value,
  onChange,
  suggestions,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setInputValue(value); }, [value]);

  const filtered = suggestions.filter((s) =>
    s.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInput = (v: string) => {
    setInputValue(v);
    onChange(v);
    setOpen(true);
  };

  const handleSelect = (s: string) => {
    setInputValue(s);
    onChange(s);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Ex : Data & IA, Développement Web..."
          className="rounded-xl border-border/50 pr-8"
        />
        <ChevronDown
          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
          onClick={() => setOpen((o) => !o)}
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-4 py-2 text-sm hover:bg-muted/60 transition-colors"
              onMouseDown={() => handleSelect(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {inputValue && !suggestions.includes(inputValue) && (
        <p className="text-xs text-blue-500 mt-1">
          ✦ Nouvelle catégorie — sera créée automatiquement
        </p>
      )}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface FormationFormModalProps {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: any) => Promise<void>; // ✅ async — pour que isSubmitting fonctionne
  editModeData?: Formation;
  categories: string[];
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function FormationFormModal({
  isOpen,
  onOpenChange,
  onSave,
  editModeData,
  categories,
}: FormationFormModalProps) {
  const isEdit = !!editModeData;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormationValues>({
    resolver: zodResolver(formationSchema),
    defaultValues: {
      titre: "",
      categorie: "",
      description: "",
      dureeHeures: 10,
      prix: 500,
      niveauType: "présentiel",
      statut: "active",
    },
  });

  const categorieValue = watch("categorie");

  useEffect(() => {
    if (!isOpen) return;
    if (editModeData) {
      reset({
        titre:       editModeData.titre,
        categorie:   editModeData.categorie,
        description: editModeData.description,
        dureeHeures: editModeData.dureeHeures,
        prix:        editModeData.prix,
        niveauType:  editModeData.niveauType ?? "présentiel",
        statut:      editModeData.statut     ?? "active",
      });
    } else {
      reset({
        titre: "", categorie: "", description: "",
        dureeHeures: 10, prix: 500,
        niveauType: "présentiel", statut: "active",
      });
    }
  }, [isOpen, editModeData, reset]);

  // ✅ Fix onSubmit : retourne la Promise de onSave
  //    → handleSubmit va attendre la fin avant de mettre isSubmitting à false
  const onSubmit = async (data: FormationValues) => {
    if (isEdit && editModeData) {
      await onSave({ ...editModeData, ...data });
    } else {
      await onSave(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTitle>
        {isEdit ? "Modifier la formation" : "Nouvelle formation"}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Titre */}
        <div>
          <Label htmlFor="titre">Intitulé *</Label>
          <Input
            id="titre"
            {...register("titre")}
            placeholder="Ex : Formation React Avancé"
            className="rounded-xl border-border/50"
          />
          {errors.titre && <p className="text-xs text-destructive mt-1">{errors.titre.message}</p>}
        </div>

        {/* Catégorie */}
        <div>
          <Label>Catégorie *</Label>
          <CategorieInput
            value={categorieValue}
            onChange={(v) => setValue("categorie", v, { shouldValidate: true })}
            suggestions={categories}
            error={errors.categorie?.message}
          />
        </div>

        {/* Type + Statut */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="niveauType">Type *</Label>
            <SelectNative id="niveauType" {...register("niveauType")} className="rounded-xl border-border/50">
              <option value="présentiel">🖥 Présentiel</option>
              <option value="en_ligne">🌐 En ligne</option>
            </SelectNative>
            {errors.niveauType && <p className="text-xs text-destructive mt-1">{errors.niveauType.message}</p>}
          </div>
          <div>
            <Label htmlFor="statut">Statut *</Label>
            <SelectNative id="statut" {...register("statut")} className="rounded-xl border-border/50">
              <option value="active">✅ Active</option>
              <option value="completed">🏁 Terminée</option>
            </SelectNative>
            {errors.statut && <p className="text-xs text-destructive mt-1">{errors.statut.message}</p>}
          </div>
        </div>

        {/* Prix + Durée */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="prix">Prix (DA) *</Label>
            {/* ✅ Fix : pas de valueAsNumber ici — z.coerce s'en charge */}
            <Input
              id="prix"
              type="number"
              min={0}
              step={0.01}
              {...register("prix")}
              className="rounded-xl border-border/50"
            />
            {errors.prix && <p className="text-xs text-destructive mt-1">{errors.prix.message}</p>}
          </div>
          <div>
            <Label htmlFor="dureeHeures">Durée (heures) *</Label>
            {/* ✅ Fix : pas de valueAsNumber ici — z.coerce s'en charge */}
            <Input
              id="dureeHeures"
              type="number"
              min={1}
              {...register("dureeHeures")}
              className="rounded-xl border-border/50"
            />
            {errors.dureeHeures && <p className="text-xs text-destructive mt-1">{errors.dureeHeures.message}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Décrivez le contenu, les objectifs et le public cible..."
            className="rounded-xl border-border/50 min-h-[100px]"
          />
          {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
        </div>

        {/* Boutons */}
        <DialogFooter className="mt-6 pt-4 border-t border-border/30">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:opacity-90"
          >
            {isSubmitting ? "Enregistrement..." : isEdit ? "Sauvegarder" : "Créer la formation"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}