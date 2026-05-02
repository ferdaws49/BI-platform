
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, CheckCircle, XCircle } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// PAGE : /reset-password?token=xxxx
// L'utilisateur arrive ici depuis le lien dans l'email
// ─────────────────────────────────────────────────────────────
export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Vérifications en temps réel
  const checks = {
    length: password.length >= 6,
    match: password === confirm && confirm.length > 0,
  };
  const isValid = checks.length && checks.match;

  // Rediriger si pas de token dans l'URL
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.push("/auth/login");
    }
  }, [mounted, token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !token) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("http://localhost:5000/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        // Rediriger vers login après 3 secondes
        setTimeout(() => router.push("/auth/login"), 3000);
      } else {
        setStatus("error");
        setErrorMsg(data.message ?? "Une erreur est survenue");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  };

  // ── Écran succès ─────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Mot de passe mis à jour !
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Votre mot de passe a été réinitialisé avec succès. Vous allez être
            redirigé vers la page de connexion...
          </p>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-emerald-500 h-1.5 rounded-full animate-[shrink_3s_linear_forwards]" />
          </div>
        </div>
      </div>
    );
  }

  // ── Formulaire principal ─────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound size={24} className="text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Nouveau mot de passe
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Choisissez un mot de passe sécurisé pour votre compte
          </p>
        </div>

        {/* Erreur token expiré ou invalide */}
        {status === "error" && (
          <div className="mb-4 flex items-start gap-2 px-3 py-3 bg-red-50 border border-red-200 rounded-xl">
            <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nouveau mot de passe */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 caractères"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                           outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400
                           transition pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirmation */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Répétez le mot de passe"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                           outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400
                           transition pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Indicateurs de validation en temps réel */}
          {(password || confirm) && (
            <div className="space-y-1.5 p-3 bg-gray-50 rounded-xl">
              <Check ok={checks.length} label="Au moins 6 caractères" />
              <Check
                ok={checks.match}
                label="Les mots de passe correspondent"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || loading}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700
                       text-white text-sm font-medium transition
                       disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Mise à jour..." : "Confirmer le nouveau mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Sous-composant indicateur ────────────────────────────────
function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
          ok ? "bg-emerald-500" : "bg-gray-200"
        }`}
      >
        {ok && <CheckCircle size={10} className="text-white" />}
      </div>
      <span
        className={`text-xs ${ok ? "text-emerald-600 font-medium" : "text-gray-400"}`}
      >
        {label}
      </span>
    </div>
  );
}