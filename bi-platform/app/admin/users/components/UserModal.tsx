"use client";

import { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import type { User } from "./UserTable";

interface UserModalProps {
  user?: User | null;
  onClose: () => void;
  onSave: (data: Omit<User, "id" | "creeLe"> & { password?: string }) => void;
}

export default function UserModal({ user, onClose, onSave }: UserModalProps) {
  const isEdit = !!user;

  const [nom, setNom] = useState(user?.nom ?? "");
  const [prenom, setPrenom] = useState(user?.prenom ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<User["role"]>(
    user?.role ?? "Resp. Pédagogique",
  );
  const [isActive, setIsActive] = useState<boolean>(user?.isActive ?? true);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 " +
    "outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition bg-white";

  const labelCls =
    "text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nom.trim() || !email.trim()) return;

    // En mode création : mot de passe obligatoire
    if (!isEdit && password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        nom,
        prenom,
        email,
        role,
        isActive,
        ...(!isEdit && { password }), // ← inclus seulement en création
      });
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* ── En-tête ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEdit
                ? "Modifiez les informations ci-dessous"
                : "Remplissez les informations ci-dessous"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Erreur ── */}
        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
            {error}
          </div>
        )}

        {/* ── Formulaire ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom complet */}
          <div>
            <label className={labelCls}>Nom complet</label>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex: Sami Trabelsi"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Prénom</label>
            <input
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="ex: Mohamed"
              className={inputCls}
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: sami@centre.tn"
              className={inputCls}
              required
            />
          </div>

          {/* Mot de passe — affiché UNIQUEMENT en mode création */}
          {!isEdit && (
            <div>
              <label className={labelCls}>Mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                  className={inputCls + " pr-10"}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Le mot de passe sera hashé automatiquement par le backend.
              </p>
            </div>
          )}

          {/* Rôle */}
          <div>
            <label className={labelCls}>Rôle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as User["role"])}
              className={inputCls}
            >
              <option value="Admin">Admin</option>
              <option value="Directeur">Directeur</option>
              <option value="Resp. Pédagogique">Resp. Pédagogique</option>
            </select>
          </div>

          {/* Activation du compte */}
          <div>
            <label className={labelCls}>Activation du compte</label>
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition
                  ${
                    isActive
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-gray-200 text-gray-500 hover:border-emerald-300"
                  }`}
              >
                ✓ Actif
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition
                  ${
                    !isActive
                      ? "bg-red-500 border-red-500 text-white"
                      : "bg-white border-gray-200 text-gray-500 hover:border-red-300"
                  }`}
              >
                ✗ Inactif
              </button>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition disabled:opacity-60"
            >
              {loading ? "..." : isEdit ? "Mettre à jour" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
