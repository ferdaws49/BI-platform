"use client";

import { Trash2 } from "lucide-react";
import type { PendingApprenant } from "./pendingTable";

// ─────────────────────────────────────────────────────────────
// COMPOSANT : dialog confirmation suppression apprenant
// ─────────────────────────────────────────────────────────────
interface DeleteLearnerDialogProps {
  apprenant: PendingApprenant;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteLearnerDialog({
  apprenant,
  onConfirm,
  onClose,
}: DeleteLearnerDialogProps) {
  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50
                    flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div
          className="w-12 h-12 bg-red-50 rounded-full flex items-center
                        justify-center mx-auto mb-4"
        >
          <Trash2 size={20} className="text-red-500" />
        </div>

        <h2 className="text-base font-bold text-gray-900 mb-1">
          Supprimer l'apprenant
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Êtes-vous sûr de vouloir supprimer{" "}
          <strong className="text-gray-800">
            {apprenant.nom} {apprenant.prenom}
          </strong>{" "}
          ? Cette action est irréversible.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm
                       text-gray-600 hover:bg-gray-50 transition font-medium"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600
                       text-white text-sm font-semibold transition"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
