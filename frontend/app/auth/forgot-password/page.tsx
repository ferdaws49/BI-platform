'use client'

import { useState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/auth.api'
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'

type Step = 'form' | 'sent'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('form')

  function validate() {
    if (!email) { setEmailError("Email requis"); return false }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError("Email invalide"); return false }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)

    try {
      const res = await requestPasswordReset(email.toLowerCase())
      if (res.success) setStep('sent')
      else setEmailError("Erreur lors de l'envoi")
    } catch {
      setEmailError("Erreur serveur")
    } finally {
      setLoading(false)
    }
  }

  // ─── LOGO SVG (identique Login/Register) ───
  const LogoSVG = () => (
    <svg
      viewBox="0 0 600 600"
      className="w-44 h-44 drop-shadow-2xl"
      xmlns="http://www.w3.org/2000/svg"
    >
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

      {/* Cercle extérieur */}
      <circle
        cx="300"
        cy="280"
        r="185"
        fill="none"
        stroke="url(#circleGrad)"
        strokeWidth="4"
        opacity="0.8"
      />
      <circle
        cx="300"
        cy="280"
        r="165"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        opacity="0.3"
        strokeDasharray="6 6"
      />

      {/* Ligne de séparation */}
      <line
        x1="300"
        y1="120"
        x2="300"
        y2="440"
        stroke="white"
        strokeWidth="2"
        opacity="0.4"
        strokeDasharray="4 4"
      />

      {/* === CERVEAU GAUCHE === */}
      <path
        d="M 170 200 C 150 180, 140 220, 145 250 C 135 270, 145 300, 160 320 C 150 350, 170 380, 200 390 C 220 410, 260 400, 280 380 L 300 380 L 300 160 C 270 150, 240 160, 220 180 C 200 170, 180 180, 170 200Z"
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      />

      {/* Gyri détails */}
      <path
        d="M 180 220 C 200 210, 220 230, 215 250"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M 175 280 C 195 270, 210 285, 205 305"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M 195 340 C 215 330, 235 345, 230 365"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Nodes */}
      <circle cx="195" cy="235" r="7" fill="white" filter="url(#glow-strong)" />
      <circle cx="185" cy="295" r="7" fill="white" filter="url(#glow-strong)" />
      <circle cx="210" cy="355" r="7" fill="white" filter="url(#glow-strong)" />
      <circle cx="255" cy="320" r="7" fill="white" filter="url(#glow-strong)" />

      {/* Connexions */}
      <path
        d="M 195 235 L 220 260 L 185 295"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <path
        d="M 185 295 L 210 320 L 210 355"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <path
        d="M 210 355 L 240 340 L 255 320"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <path
        d="M 255 320 L 280 320"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* === GRAPHIQUE DROITE === */}
      <rect
        x="330"
        y="310"
        width="28"
        height="90"
        rx="5"
        fill="url(#barGrad)"
        opacity="0.85"
        filter="url(#glow)"
      />
      <rect
        x="375"
        y="260"
        width="28"
        height="140"
        rx="5"
        fill="url(#barGrad)"
        opacity="1"
        filter="url(#glow)"
      />
      <rect
        x="420"
        y="335"
        width="28"
        height="65"
        rx="5"
        fill="url(#barGrad)"
        opacity="0.7"
        filter="url(#glow)"
      />

      {/* Ligne tendance */}
      <path
        d="M 315 380 L 360 340 L 405 355 L 460 280"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow-strong)"
      />
      <path
        d="M 445 295 L 460 280 L 455 300"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow-strong)"
      />

      {/* Points sur la ligne */}
      <circle cx="360" cy="340" r="5" fill="white" filter="url(#glow-strong)" />
      <circle cx="405" cy="355" r="5" fill="white" filter="url(#glow-strong)" />
      <circle cx="460" cy="280" r="5" fill="white" filter="url(#glow-strong)" />

      {/* === TEXTE DANS SVG === */}
      <text
        x="300"
        y="540"
        textAnchor="middle"
        fill="white"
        fontFamily="'Segoe UI', system-ui, sans-serif"
        fontSize="52"
        fontWeight="800"
        letterSpacing="0.04em"
        filter="url(#glow)"
      >
        MBIcenter
      </text>
      <text
        x="300"
        y="570"
        textAnchor="middle"
        fill="white"
        fontFamily="'Segoe UI', system-ui, sans-serif"
        fontSize="16"
        fontWeight="400"
        letterSpacing="0.15em"
        opacity="0.7"
      >
        INTELLIGENCE · DATA · GROWTH
      </text>
    </svg>
  )

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-secondary">

      {/* LEFT */}
      <div className="w-full md:w-1/2 flex items-center justify-center h-full">

        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6">

          {/* HEADER */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">
              Mot de passe oublié
            </h2>
            <p className="text-gray-500 mt-2">
              Entrez votre email pour recevoir un lien
            </p>
          </div>

          {/* SUCCESS STEP */}
          {step === 'sent' ? (
            <div className="text-center space-y-6">

              <div className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-xl flex items-center justify-center gap-2">
                <CheckCircle2 size={18} />
                Email envoyé !
              </div>

              <p className="text-gray-500 text-sm">
                Si un compte existe pour <span className="font-bold">{email}</span>,
                vous recevrez un lien de réinitialisation.
              </p>

              <ul className="text-sm text-gray-600 space-y-2 text-left">
                <li>✔ Vérifiez votre boîte mail</li>
                <li>✔ Regardez les spams</li>
                <li>✔ Le lien expire rapidement</li>
              </ul>

              <Link
                href="/auth/login"
                className="w-full flex justify-center py-3 btn-primary font-medium"
              >
                Retour à la connexion
              </Link>

              <button
                onClick={() => setStep('form')}
                className="text-sm text-primary hover:text-accent"
              >
                Réessayer avec un autre email
              </button>

            </div>
          ) : (
            <>
              {/* ERROR */}
              {emailError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {emailError}
                </div>
              )}

              {/* FORM */}
              <form onSubmit={handleSubmit} className="space-y-5">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-400" size={18} />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setEmailError('')
                      }}
                      className="input w-full pl-10"
                      placeholder="votre@email.com"
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
                      Envoi...
                    </>
                  ) : (
                    "Envoyer le lien"
                  )}
                </button>

              </form>

              {/* LINKS */}
              <div className="text-center text-sm space-y-2 pt-2">

                <Link
                  href="/auth/login"
                  className="text-primary hover:text-accent block"
                >
                  ← Retour à la connexion
                </Link>

                <div>
                  <span className="text-gray-500">
                    Vous n'avez pas de compte ?
                  </span>{' '}

                  <Link
                    href="/auth/register"
                    className="text-primary font-medium hover:text-accent"
                  >
                    S'inscrire
                  </Link>
                </div>

              </div>
            </>
          )}

        </div>
      </div>

      {/* RIGHT — Logo identique Login/Register */}
      <div className="hidden md:flex w-1/2 h-full min-h-screen bg-gradient-to-br from-primary to-accent items-center justify-center">
        <div className="text-white text-center px-10 flex flex-col items-center">
          <div className="flex flex-col items-center justify-center mb-6">
            <LogoSVG />
          </div>
          <h2 className="text-4xl font-bold mb-3">Récupération</h2>
          <p className="opacity-90 text-lg">
            On vous aide à retrouver l'accès à votre compte
          </p>
        </div>
      </div>
    </div>
  )
}