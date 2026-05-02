// ============================================================
// FormateurFormModal — Modal de création / modification d'un formateur
// Ce composant affiche une fenêtre modale (popup) avec un formulaire.
// Il sert à la fois à CRÉER un nouveau formateur et à MODIFIER un existant.
// ============================================================

"use client"; // Directive Next.js : ce composant s'exécute côté navigateur (client)

// --- Imports React ---
import { useEffect } from "react";
// useEffect  : exécute du code quand certaines valeurs changent (ici, quand la modale s'ouvre)

// --- Imports React Hook Form ---
import { useForm } from "react-hook-form";
// useForm : hook puissant pour gérer les formulaires (valeurs, validation, erreurs)

import { zodResolver } from "@hookform/resolvers/zod";
// zodResolver : connecte la validation Zod à React Hook Form automatiquement

import * as z from "zod";
// zod : bibliothèque de validation de données (comme des règles à respecter)

import { toast } from "sonner";
// toast : affiche des notifications (messages de succès ou d'erreur) en haut à droite

import { Formateur } from "../state";
// Formateur       : type TypeScript qui décrit un formateur (nom, email, spécialité, etc.)

// --- Composants UI personnalisés ---
import { Dialog, DialogTitle, DialogFooter, Input, Label, Textarea, Button } from "./ui";
// Dialog       : composant qui crée une fenêtre modale (popup)
// DialogTitle  : titre de la modale
// DialogFooter : zone des boutons en bas de la modale
// Input        : champ de saisie stylisé
// Label        : étiquette d'un champ
// Button       : bouton stylisé


// ============================================================
// SCHÉMA DE VALIDATION (Zod)
// Définit les règles que les données du formulaire doivent respecter.
// Si une règle est violée, un message d'erreur est affiché sous le champ.
// ============================================================
const formateurSchema = z.object({
  prenom: z.string().min(2, "Prénom requis"),    // Prénom : au moins 2 caractères
  nom:  z.string().min(2, "Nom requis"),        // Nom    : au moins 2 caractères
  email:     z.string().email("Email invalide"),     // Email  : doit être un email valide
  telephone: z.string().optional(),                 // Téléphone : optionnel
  specialite: z.string().min(1, "Spécialité requise"), // Spécialité : ne doit pas être vide
});

// TypeScript infère automatiquement le type des données du formulaire depuis le schéma Zod.
// Évite d'écrire le type manuellement.
type FormateurValues = z.infer<typeof formateurSchema>;


// ============================================================
// COMPOSANT PRINCIPAL : FormateurFormModal
// Props reçues depuis le composant parent (page.tsx) :
//   - isOpen        : true = modale visible, false = cachée
//   - onOpenChange  : fonction pour ouvrir/fermer la modale
//   - dispatch      : envoie des actions au reducer global (ajouter / modifier)
//   - editModeData  : si présent → mode Édition, sinon → mode Création
// ============================================================
export function FormateurFormModal({
  isOpen,
  onOpenChange,
  onSave,
  editModeData,
}: {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: any) => Promise<void>;
  editModeData?: Formateur; // "?" = optionnel : absent en mode création, présent en mode édition
}) {
  // Détermine si on est en mode édition (true) ou création (false)
  // !! convertit une valeur en booléen : !!undefined = false, !!{...} = true
  const isEdit = !!editModeData;

  // -------------------------------------------------------
  // INITIALISATION DU FORMULAIRE avec React Hook Form
  // - register      : lie un champ HTML au formulaire
  // - handleSubmit  : gère la soumission et appelle notre fonction onSubmit
  // - reset         : réinitialise les valeurs du formulaire
  // - errors        : contient les erreurs de validation (ex: "Prénom requis")
  // - resolver      : connecte Zod pour valider automatiquement les champs
  // -------------------------------------------------------
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormateurValues>({
    resolver: zodResolver(formateurSchema),
  });

  // -------------------------------------------------------
  // EFFET : pré-remplir le formulaire à chaque ouverture
  // Se déclenche quand isOpen, editModeData ou reset changent.
  // -------------------------------------------------------
  useEffect(() => {
    if (isOpen) {
      if (editModeData) {
        // --- MODE ÉDITION ---
        // Pré-remplit tous les champs avec les données existantes du formateur
        reset({ prenom: editModeData.prenom, nom: editModeData.nom, email: editModeData.email, specialite: editModeData.specialite, telephone: editModeData.telephone || "" });
      } else {
        // --- MODE CRÉATION ---
        // Vide tous les champs pour un formulaire propre
        reset({ prenom: "", nom: "", email: "", specialite: "", telephone: "" });
      }
    }
  }, [isOpen, editModeData, reset]);

  // -------------------------------------------------------
  // SOUMISSION DU FORMULAIRE
  // Appelée par handleSubmit uniquement si la validation Zod passe.
  // -------------------------------------------------------
  const onSubmit = async (data: FormateurValues) => {
    if (isEdit && editModeData) {
      await onSave({ ...editModeData, ...data });
    } else {
      await onSave(data);
    }
  };

  // ============================================================
  // RENDU JSX — Structure visuelle de la modale
  // ============================================================
  return (
    // Dialog : affiche ou cache la modale selon isOpen
    <Dialog open={isOpen} onOpenChange={onOpenChange}>

      {/* Titre dynamique : change selon le mode création ou édition */}
      <DialogTitle>{isEdit ? "Modifier Formateur" : "Nouveau formateur"}</DialogTitle>

      {/* handleSubmit intercepte la soumission, valide, puis appelle onSubmit */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Ligne 1 : Prénom et Nom côte à côte (grille 2 colonnes) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="prenom">Prénom *</Label>
            <Input id="prenom" {...register("prenom")} className="rounded-xl border-border/50 ring-2 ring-primary/20" />
            {errors.prenom && <p className="text-xs text-destructive mt-1">{errors.prenom.message}</p>}
          </div>
          <div>
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" {...register("nom")} className="rounded-xl border-border/50" />
            {errors.nom && <p className="text-xs text-destructive mt-1">{errors.nom.message}</p>}
          </div>
        </div>

        {/* Ligne 2 : Email & Téléphone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register("email")} className="rounded-xl border-border/50" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="telephone">Téléphone</Label>
            <Input id="telephone" {...register("telephone")} className="rounded-xl border-border/50" placeholder="0550 00 00 00" />
            {errors.telephone && <p className="text-xs text-destructive mt-1">{errors.telephone.message}</p>}
          </div>
        </div>

        {/* Ligne 3 : Spécialité */}
        <div>
          <Label htmlFor="specialite">Spécialité *</Label>
          <Input id="specialite" {...register("specialite")} className="rounded-xl border-border/50" />
          {errors.specialite && <p className="text-xs text-destructive mt-1">{errors.specialite.message}</p>}
        </div>

        {/* Pied de la modale : boutons Annuler et Créer/Sauvegarder */}
        <DialogFooter className="mt-6 pt-4 border-t border-transparent">
          {/* type="button" empêche ce bouton de soumettre le formulaire */}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            Annuler
          </Button>
          {/* type="submit" déclenche la validation et la soumission */}
          <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:opacity-90">
            {isSubmitting ? "Chargement..." : (isEdit ? "Sauvegarder" : "Créer")}
          </Button>
        </DialogFooter>

      </form>
    </Dialog>
  );
}
