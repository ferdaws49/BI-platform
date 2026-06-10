'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { verifyResetToken, resetPassword } from '@/lib/auth.api'
import { Eye, EyeOff, AlertCircle, CheckCircle2, XCircle, Loader2, ArrowLeft, Lock } from 'lucide-react'

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

  // ─── LOGO SVG (identique Login/Register) ───
  const LogoSVG = () => (
    <svg viewBox="0 0 600 600" className="w-44 h-44 drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feFlood floodColor="white" floodOpacity="0.4" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-strong" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feFlood floodColor="white" floodOpacity="0.6" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="100%" stopColor="white" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <circle cx="300" cy="280" r="185" fill="none" stroke="url(#circleGrad)" strokeWidth="4" opacity="0.8" />
      <circle cx="300" cy="280" r="165" fill="none" stroke="white" strokeWidth="1.5" opacity="0.3" strokeDasharray="6 6" />
      <line x1="300" y1="120" x2="300" y2="440" stroke="white" strokeWidth="2" opacity="0.4" strokeDasharray="4 4" />
      <path d="M 170 200 C 150 180, 140 220, 145 250 C 135 270, 145 300, 160 320 C 150 350, 170 380, 200 390 C 220 410, 260 400, 280 380 L 300 380 L 300 160 C 270 150, 240 160, 220 180 C 200 170, 180 180, 170 200Z" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
      <path d="M 180 220 C 200 210, 220 230, 215 250" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <path d="M 175 280 C 195 270, 210 285, 205 305" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <path d="M 195 340 C 215 330, 235 345, 230 365" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <circle cx="195" cy="235" r="7" fill="white" filter="url(#glow-strong)" />
      <circle cx="185" cy="295" r="7" fill="white" filter="url(#glow-strong)" />
      <circle cx="210" cy="355" r="7" fill="white" filter="url(#glow-strong)" />
      <circle cx="255" cy="320" r="7" fill="white" filter="url(#glow-strong)" />
      <path d="M 195 235 L 220 260 L 185 295" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <path d="M 185 295 L 210 320 L 210 355" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <path d="M 210 355 L 240 340 L 255 320" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <path d="M 255 320 L 280 320" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <rect x="330" y="310" width="28" height="90" rx="5" fill="url(#barGrad)" opacity="0.85" filter="url(#glow)" />
      <rect x="375" y="260" width="28" height="140" rx="5" fill="url(#barGrad)" opacity="1" filter="url(#glow)" />
      <rect x="420" y="335" width="28" height="65" rx="5" fill="url(#barGrad)" opacity="0.7" filter="url(#glow)" />
      <path d="M 315 380 L 360 340 L 405 355 L 460 280" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-strong)" />
      <path d="M 445 295 L 460 280 L 455 300" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-strong)" />
      <circle cx="360" cy="340" r="5" fill="white" filter="url(#glow-strong)" />
      <circle cx="405" cy="355" r="5" fill="white" filter="url(#glow-strong)" />
      <circle cx="460" cy="280" r="5" fill="white" filter="url(#glow-strong)" />
      <text x="300" y="540" textAnchor="middle" fill="white" fontFamily="'Segoe UI', system-ui, sans-serif" fontSize="52" fontWeight="800" letterSpacing="0.04em" filter="url(#glow)">MBIcenter</text>
      <text x="300" y="570" textAnchor="middle" fill="white" fontFamily="'Segoe UI', system-ui, sans-serif" fontSize="16" fontWeight="400" letterSpacing="0.15em" opacity="0.7">INTELLIGENCE · DATA · GROWTH</text>
    </svg>
  )

  // ─── 1. VÉRIFICATION EN COURS ───
  if (isVerifying) {
    return (
      <div className="w-screen h-screen flex overflow-hidden bg-secondary">
        <div className="w-full md:w-1/2 flex items-center justify-center h-full">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-primary mb-4" size={48} />
            <p className="text-gray-500 font-medium">Vérification du lien de sécurité...</p>
          </div>
        </div>
        <div className="hidden md:flex w-1/2 h-full min-h-screen bg-gradient-to-br from-primary to-accent items-center justify-center">
          <div className="text-white text-center px-10 flex flex-col items-center">
            <div className="flex flex-col items-center justify-center mb-6">
              <LogoSVG />
            </div>
            <h2 className="text-4xl font-bold mb-3">Vérification 🔐</h2>
            <p className="opacity-90 text-lg">Vérification de votre lien en cours</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── 2. LIEN INVALIDE / EXPIRÉ ───
  if (!isTokenValid) {
    return (
      <div className="w-screen h-screen flex overflow-hidden bg-secondary">
        <div className="w-full md:w-1/2 flex items-center justify-center h-full">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6 text-center">
           
            <h2 className="text-3xl font-bold text-gray-800">Nouveau mot de passee</h2>
            <p className="text-gray-500 mt-2">Définissez un mot de passe sécurisé</p>
            <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm text-left">
                    Erreur de lien
                  </div>
            <p className="text-gray-500">
              {"Ce lien n'est plus utilisable. Veuillez demander un nouveau lien"}
            </p>
            <div className="space-y-3">
              <Link
                href="/auth/forgot-password"
                className="w-full flex justify-center py-3 btn-primary font-medium"
              >
                Demander un nouveau lien
              </Link>
              <Link
                href="/auth/login"
                className="text-sm text-primary hover:text-accent transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft size={16} />
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
        <div className="hidden md:flex w-1/2 h-full min-h-screen bg-gradient-to-br from-primary to-accent items-center justify-center">
          <div className="text-white text-center px-10 flex flex-col items-center">
            <div className="flex flex-col items-center justify-center mb-6">
              <LogoSVG />
            </div>
            <h2 className="text-4xl font-bold mb-3">Lien invalide ❌</h2>
            <p className="opacity-90 text-lg">Ce lien de réinitialisation n'est plus utilisable</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── 3. SUCCÈS ───
  if (success) {
    return (
      <div className="w-screen h-screen flex overflow-hidden bg-secondary">
        <div className="w-full md:w-1/2 flex items-center justify-center h-full">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
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
        <div className="hidden md:flex w-1/2 h-full min-h-screen bg-gradient-to-br from-primary to-accent items-center justify-center">
          <div className="text-white text-center px-10 flex flex-col items-center">
            <div className="flex flex-col items-center justify-center mb-6">
              <LogoSVG />
            </div>
            <h2 className="text-4xl font-bold mb-3">Succès ✅</h2>
            <p className="opacity-90 text-lg">Votre compte est sécurisé</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── 4. FORMULAIRE (token valide) ───
  return (
    <div className="w-screen h-screen flex overflow-hidden bg-secondary">
      {/* LEFT */}
      <div className="w-full md:w-1/2 flex items-center justify-center h-full">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6">

          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">Nouveau mot de passe</h2>
            <p className="text-gray-500 mt-2">Définissez un mot de passe sécurisé</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

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
                  onChange={(e) => { setNewPassword(e.target.value); setError('') }}
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
                  onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
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

      {/* RIGHT — Logo identique Login/Register */}
      <div className="hidden md:flex w-1/2 h-full min-h-screen bg-gradient-to-br from-primary to-accent items-center justify-center">
        <div className="text-white text-center px-10 flex flex-col items-center">
          <div className="flex flex-col items-center justify-center mb-6">
            <LogoSVG />
          </div>
          <h2 className="text-4xl font-bold mb-3">Réinitialisation 🔐</h2>
          <p className="opacity-90 text-lg">Définissez un nouveau mot de passe sécurisé</p>
        </div>
      </div>
    </div>
  )
}