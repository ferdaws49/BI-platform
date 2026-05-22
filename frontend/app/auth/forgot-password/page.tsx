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

      {/* RIGHT */}
      <div className="hidden md:flex w-1/2 h-full bg-gradient-to-br from-primary to-accent relative items-center justify-center">

        <div className="absolute w-72 h-72 bg-accent rounded-full -top-10 -right-10 opacity-30"></div>
        <div className="absolute w-72 h-72 bg-primary rounded-full -bottom-10 -left-10 opacity-30"></div>

        <div className="text-white text-center px-10">
          <h2 className="text-4xl font-bold mb-4">
            Récupération 🔐
          </h2>
          <p className="opacity-90">
            On vous aide à retrouver l'accès à votre compte
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