"use client";

import { KeyRound } from "lucide-react";
import type { User } from "./UserTable";

interface ResetPasswordDialogProps {
  user: User;
  onConfirm: () => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT : dialog confirmation réinitialisation mot de passe
//
// Flux :
//  1. Admin clique 🔑 → ce dialog s'ouvre
//  2. Admin confirme → POST /admin/users/:id/reset-password
//  3. Backend génère token + envoie email (Nodemailer)
//  4. Utilisateur clique le lien → saisit nouveau mot de passe
//  5. Backend vérifie token + bcrypt hash + update BDD
// ─────────────────────────────────────────────────────────────
export default function ResetPasswordDialog({ user, onConfirm, onClose }: ResetPasswordDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">

        {/* Icône bleue */}
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <KeyRound size={20} className="text-blue-500" />
        </div>

        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Réinitialiser le mot de passe
        </h2>

        <p className="text-sm text-gray-500 mb-2">
          Un email sera envoyé à :
        </p>
        <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl mb-4 break-all">
          {user.email}
        </p>
        <p className="text-xs text-gray-400 mb-6">
          L'utilisateur recevra un lien sécurisé valable 24h pour définir un nouveau mot de passe.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition font-medium"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition"
          >
            Envoyer l'email
          </button>
        </div>
      </div>
    </div>
  );
}