'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2, Clock, ArrowRight, ArrowLeft } from 'lucide-react'

export default function VerifyEmailPage() {
  const params = useParams()
  const id = params.id as string
  const token = params.token as string

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!id || !token) {
      setStatus('error')
      setErrorMessage("Lien de vérification incomplet.")
      return
    }

    const verify = async () => {
      try {
        const response = await fetch(`http://localhost:5000/auth/verify-email/${id}/${token}`, {
          method: 'GET',
        })

        const data = await response.json()

        if (response.ok) {
          setStatus('success')
        } else {
          setStatus('error')
          setErrorMessage(data.message || "Échec de la vérification.")
        }
      } catch {
        setStatus('error')
        setErrorMessage("Le serveur backend est injoignable.")
      }
    }

    verify()
  }, [id, token])

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

  // ─── 1. CHARGEMENT ───
  if (status === 'loading') {
    return (
      <div className="w-screen h-screen flex overflow-hidden bg-secondary">
        <div className="w-full md:w-1/2 flex items-center justify-center h-full">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Vérification...</h2>
            <p className="text-gray-500">Validation de votre adresse email en cours.</p>
          </div>
        </div>

        {/* RIGHT — Logo identique Login/Register */}
        <div className="hidden md:flex w-1/2 h-full min-h-screen bg-gradient-to-br from-primary to-accent items-center justify-center">
          <div className="text-white text-center px-10 flex flex-col items-center">
            <div className="flex flex-col items-center justify-center mb-6">
              <LogoSVG />
            </div>
            <h2 className="text-4xl font-bold mb-3">Vérification 📧</h2>
            <p className="opacity-90 text-lg">Validation de votre compte en cours</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── 2. SUCCÈS ───
  if (status === 'success') {
    return (
      <div className="w-screen h-screen flex overflow-hidden bg-secondary">
        <div className="w-full md:w-1/2 flex items-center justify-center h-full">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Inscription realisé !</h2>
            <p className="text-gray-500">
              Votre compte a été créé  avec succès.<br />
              <span className="font-bold text-primary flex items-center justify-center gap-2 mt-2">
                Votre inscription est actuellement en attente de validation par notre administrateur.
              </span>
            </p>
            <Link
              href="/auth/login"
              className="w-full flex justify-center items-center py-3 btn-primary font-medium gap-2"
            >
              Aller à la connexion <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        {/* RIGHT — Logo identique Login/Register */}
        <div className="hidden md:flex w-1/2 h-full min-h-screen bg-gradient-to-br from-primary to-accent items-center justify-center">
          <div className="text-white text-center px-10 flex flex-col items-center">
            <div className="flex flex-col items-center justify-center mb-6">
              <LogoSVG />
            </div>
            <h2 className="text-4xl font-bold mb-3">Rejoignez-nous</h2>
            <p className="opacity-90 text-lg">Créez votre compte pour accéder aux formations</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── 3. ERREUR ───
  return (
    <div className="w-screen h-screen flex overflow-hidden bg-secondary">
      <div className="w-full md:w-1/2 flex items-center justify-center h-full">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <XCircle size={32} />
          </div> 
          <h2 className="text-3xl font-bold text-red-600">Erreur de lien</h2>
          <p className="text-gray-500 font-medium">Ce lien n'est plus utilisable. Veuiller demander un nouveau lien</p>
          <div className="space-y-3">
            <Link
              href="/auth/register"
              className="w-full flex justify-center py-3 btn-primary font-medium"
            >
              Recommencer l'inscription
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

      {/* RIGHT — Logo identique Login/Register */}
      <div className="hidden md:flex w-1/2 h-full min-h-screen bg-gradient-to-br from-primary to-accent items-center justify-center">
        <div className="text-white text-center px-10 flex flex-col items-center">
          <div className="flex flex-col items-center justify-center mb-6">
            <LogoSVG />
          </div>
          <h2 className="text-4xl font-bold mb-3">Erreur ❌</h2>
          <p className="opacity-90 text-lg">Le lien de vérification est invalide ou expiré</p>
        </div>
      </div>
    </div>
  )
}