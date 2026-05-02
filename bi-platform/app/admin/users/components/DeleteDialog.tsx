"use client";

import { Trash2 } from "lucide-react";
import type { User } from "./UserTable";

// ─────────────────────────────────────────────────────────────
// TYPES DES PROPS
// ─────────────────────────────────────────────────────────────
interface DeleteDialogProps {
  user: User;             // l'utilisateur à supprimer (pour afficher son nom)
  onConfirm: () => void;  // appelé si l'admin confirme la suppression
  onClose: () => void;    // appelé si l'admin annule
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT : dialog de confirmation avant suppression
// Pattern "AlertDialog" → toujours demander avant de supprimer
// ─────────────────────────────────────────────────────────────
export default function DeleteDialog({
  user,
  onConfirm,
  onClose,
}: DeleteDialogProps) {
  return (
    // Fond sombre avec flou (overlay)
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">

      {/* Carte du dialog */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">

        {/* Icône rouge en haut */}
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-red-500" />
        </div>

        {/* Titre */}
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Supprimer l'utilisateur
        </h2>

        {/* Message avec le nom de l'utilisateur concerné */}
        <p className="text-sm text-gray-500 mb-6">
          Êtes-vous sûr de vouloir supprimer{" "}
          <strong className="text-gray-800">{user.nom}</strong> ?{" "}
          Cette action est irréversible.
        </p>

        {/* Boutons : Annuler + Confirmer */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm
                       text-gray-600 hover:bg-gray-50 transition font-medium"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600
                       text-white text-sm font-medium transition"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}