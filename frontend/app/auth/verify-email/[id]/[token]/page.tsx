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
        <div className="hidden md:flex w-1/2 h-full bg-gradient-to-br from-primary to-accent items-center justify-center">
          <div className="text-white text-center px-10">
            <h2 className="text-4xl font-bold mb-4">Vérification 📧</h2>
            <p className="opacity-90">Vérification de votre compte en cours</p>
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
            <h2 className="text-3xl font-bold text-gray-800">Email vérifié !</h2>
            <p className="text-gray-500">
              Votre adresse email a été confirmée avec succès.<br />
              <span className="font-bold text-primary flex items-center justify-center gap-2 mt-2">
                <Clock size={16} /> Compte en attente de validation par l'administrateur.
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
        <div className="hidden md:flex w-1/2 h-full bg-gradient-to-br from-primary to-accent relative items-center justify-center">
          <div className="absolute w-72 h-72 bg-accent rounded-full -top-10 -right-10 opacity-30"></div>
          <div className="absolute w-72 h-72 bg-primary rounded-full -bottom-10 -left-10 opacity-30"></div>
          <div className="text-white text-center px-10">
            <h2 className="text-4xl font-bold mb-4">Succès ✅</h2>
            <p className="opacity-90">Votre compte est maintenant activé</p>
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

  // ─── 3. ERREUR ───
  return (
    <div className="w-screen h-screen flex overflow-hidden bg-secondary">
      <div className="w-full md:w-1/2 flex items-center justify-center h-full">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <XCircle size={32} />
          </div>
          <h2 className="text-3xl font-bold text-red-600">Erreur de lien</h2>
          <p className="text-gray-500 font-medium">{errorMessage}</p>
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
      <div className="hidden md:flex w-1/2 h-full bg-gradient-to-br from-primary to-accent relative items-center justify-center">
        <div className="absolute w-72 h-72 bg-accent rounded-full -top-10 -right-10 opacity-30"></div>
        <div className="absolute w-72 h-72 bg-primary rounded-full -bottom-10 -left-10 opacity-30"></div>
        <div className="text-white text-center px-10">
          <h2 className="text-4xl font-bold mb-4">Erreur ❌</h2>
          <p className="opacity-90">Le lien de vérification est invalide ou expiré</p>
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