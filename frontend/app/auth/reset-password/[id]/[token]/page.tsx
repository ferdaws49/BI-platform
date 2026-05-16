'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { verifyResetToken, resetPassword } from '@/lib/auth.api'
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowLeft, Lock } from 'lucide-react'

export default function ResetPasswordPage() {
  const { id, token } = useParams()
  const router = useRouter()

  const [isVerifying, setIsVerifying] = useState(true)
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function checkToken() {
      try {
        const res = await verifyResetToken(id as string, token as string)
        if (res.success) {
          setIsTokenValid(true)
        } else {
          setError(res.error || "Ce lien de réinitialisation est invalide ou a expiré.")
        }
      } catch {
        setError("Impossible de contacter le serveur.")
      } finally {
        setIsVerifying(false)
      }
    }
    checkToken()
  }, [id, token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      const res = await resetPassword(Number(id), token as string, newPassword)
      if (res.success) {
        setSuccess(true)
        setTimeout(() => { router.push('/auth/login') }, 3000)
      } else {
        setError(res.error || "Une erreur est survenue lors de la mise à jour.")
      }
    } catch {
      setError("Erreur réseau. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  // ─── 1. Écran de vérification ───
  if (isVerifying) {
    return (
      <div className="w-screen h-screen flex overflow-hidden bg-secondary">
        <div className="w-full md:w-1/2 flex items-center justify-center h-full">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-primary mb-4" size={48} />
            <p className="text-gray-500 font-medium">Vérification du lien de sécurité...</p>
          </div>
        </div>
        <div className="hidden md:flex w-1/2 h-full bg-gradient-to-br from-primary to-accent items-center justify-center">
          <div className="text-white text-center px-10">
            <h2 className="text-4xl font-bold mb-4">Sécurité 🔐</h2>
            <p className="opacity-90">Vérification de votre lien en cours</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── 2. Écran de succès ───
  if (success) {
    return (
      <div className="w-screen h-screen flex overflow-hidden bg-secondary">
        <div className="w-full md:w-1/2 flex items-center justify-center h-full">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Mot de passe mis à jour !</h2>
            <p className="text-gray-500">
              Votre mot de passe a été modifié avec succès.<br />
              Vous allez être redirigé vers la connexion.
            </p>
            <Link
              href="/auth/login"
              className="w-full flex justify-center py-3 btn-primary font-medium"
            >
              Se connecter maintenant
            </Link>
          </div>
        </div>
        <div className="hidden md:flex w-1/2 h-full bg-gradient-to-br from-primary to-accent items-center justify-center">
          <div className="text-white text-center px-10">
            <h2 className="text-4xl font-bold mb-4">Succès ✅</h2>
            <p className="opacity-90">Votre compte est sécurisé</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── 3. Formulaire / Erreur ───
  return (
    <div className="w-screen h-screen flex overflow-hidden bg-secondary">
      {/* LEFT */}
      <div className="w-full md:w-1/2 flex items-center justify-center h-full">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6">

          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">
              {isTokenValid ? 'Nouveau mot de passe' : 'Lien invalide'}
            </h2>
            <p className="text-gray-500 mt-2">
              {isTokenValid
                ? "Définissez un mot de passe sécurisé"
                : "Ce lien n'est plus utilisable"}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {isTokenValid ? (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Nouveau mot de passe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setError('')
                    }}
                    className="input w-full pl-10"
                    placeholder="Minimum 6 caractères"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirmation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setError('')
                    }}
                    className="input w-full pl-10"
                    placeholder="Répétez le mot de passe"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 btn-primary font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Mise à jour...
                  </>
                ) : (
                  "Changer mon mot de passe"
                )}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-gray-400 text-sm">
                Veuillez demander un nouveau lien pour continuer.
              </p>
              <Link
                href="/auth/forgot-password"
                className="w-full flex justify-center py-3 btn-primary font-medium"
              >
                Demander un nouveau lien
              </Link>
            </div>
          )}

          {/* Lien retour */}
          <div className="text-center text-sm pt-2">
            <Link
              href="/auth/login"
              className="text-primary hover:text-accent transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              Retour à la connexion
            </Link>
          </div>

        </div>
      </div>

      {/* RIGHT */}
      <div className="hidden md:flex w-1/2 h-full bg-gradient-to-br from-primary to-accent relative items-center justify-center">
        <div className="absolute w-72 h-72 bg-accent rounded-full -top-10 -right-10 opacity-30"></div>
        <div className="absolute w-72 h-72 bg-primary rounded-full -bottom-10 -left-10 opacity-30"></div>

        <div className="text-white text-center px-10">
          <h2 className="text-4xl font-bold mb-4">
            {isTokenValid ? 'Réinitialisation 🔐' : 'Lien expiré'}
          </h2>
          <p className="opacity-90">
            {isTokenValid
              ? "On vous aide à retrouver l'accès à votre compte"
              : "Demandez un nouveau lien de réinitialisation"}
          </p>

          <div className="mt-10 flex justify-center">
            <img
              src="/images/logoreaddly-removebg-preview (2).png"
              className="w-28 h-28 object-contain"
              alt="logo"
            />
          </div>
        </div>
      </div>
    </div>
  )
}