"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Phone, Mail, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [programme, setProgramme] = useState("");
  const [telephone, setTelephone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validatePhone(phone: string): boolean {
    if (!phone) return true;
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
    const phoneRegex = /^\+?[0-9]{8,15}$/;
    if (!phoneRegex.test(cleaned)) {
      setPhoneError("Numéro invalide. Ex: +216 55 123 456 ou 55123456");
      return false;
    }
    const digitsOnly = cleaned.replace(/\D/g, "");
    if (digitsOnly.length < 8) {
      setPhoneError("Le numéro doit contenir au moins 8 chiffres");
      return false;
    }
    setPhoneError("");
    return true;
  }

  function validateFields(): boolean {
    const errors: Record<string, string> = {};
    if (!nom.trim()) errors.nom = "Le nom est requis";
    if (!prenom.trim()) errors.prenom = "Le prénom est requis";
    if (!email.trim()) errors.email = "L'email est requis";
    if (!password.trim()) errors.password = "Le mot de passe est requis";
    if (!programme.trim()) errors.programme = "Le programme est requis";
    const phoneValid = validatePhone(telephone);
    if (!phoneValid) errors.telephone = phoneError;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateFields()) return;

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/auth/register-apprenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          prenom,
          email,
          password,
          programme,
          telephone: telephone || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur lors de l'inscription");

      setRegisteredEmail(email);
      setSuccess(true);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue lors de l'inscription";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (fieldName: string) =>
    `input w-full ${fieldErrors[fieldName] ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200" : ""}`;

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-secondary">
      {/* LEFT */}
      <div className="w-full md:w-1/2 flex items-center justify-center h-full overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6 my-auto">
          
          {/* ========== VUE CONFIRMATION (succès) ========== */}
          {success ? (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
              {/* Icône email */}
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Confirmez votre inscription
                </h2>
                <p className="text-gray-500 mt-3 leading-relaxed">
                  Nous avons envoyé un lien de confirmation à votre adresse email
                </p>
                <p className="text-gray-500 mt-3 leading-relaxed">
                  {" "}
                  <span className="font-semibold text-gray-700 break-all">{registeredEmail}</span>.
                </p>
              </div>

              {/* Instructions */}
              <div className=" text-gray-500 rounded-xl p-4 text-sm space-y-2 leading-relaxed">
                <p>
                  Veuillez vérifier votre boîte de réception et cliquer sur le lien pour <strong>valider</strong> votre compte.
                </p>
              </div>

              {/* Bouton retour */}
              <Link
                href="/auth/login"
                className="w-full flex justify-center items-center gap-2 py-3 btn-primary font-medium rounded-xl transition-transform active:scale-95"
              >
                <ArrowLeft size={18} />
                Retour à la connexion
              </Link>
            </div>
          ) : (
            /* ========== VUE FORMULAIRE (inscription) ========== */
            <>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-800">Inscription</h2>
                <p className="text-gray-500 mt-2">Créez votre compte apprenant</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm text-center">
                    {error}
                  </div>
                )}

                {/* nom + prenom */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Nom"
                      value={nom}
                      onChange={(e) => { setNom(e.target.value); clearFieldError("nom"); }}
                      className={inputClass("nom")}
                    />
                    {fieldErrors.nom && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {fieldErrors.nom}
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={prenom}
                      onChange={(e) => { setPrenom(e.target.value); clearFieldError("prenom"); }}
                      className={inputClass("prenom")}
                    />
                    {fieldErrors.prenom && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {fieldErrors.prenom}
                      </p>
                    )}
                  </div>
                </div>

                {/* email */}
                <div>
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                    className={inputClass("email")}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* password */}
                <div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                    className={inputClass("password")}
                  />
                  {fieldErrors.password && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* programme */}
                <div>
                  <input
                    type="text"
                    placeholder="Programme"
                    value={programme}
                    onChange={(e) => { setProgramme(e.target.value); clearFieldError("programme"); }}
                    className={inputClass("programme")}
                  />
                  {fieldErrors.programme && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {fieldErrors.programme}
                    </p>
                  )}
                </div>

                {/* telephone */}
                <div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      type="tel"
                      placeholder="Téléphone (optionnel)"
                      value={telephone}
                      onChange={(e) => {
                        setTelephone(e.target.value);
                        if (phoneError) validatePhone(e.target.value);
                        clearFieldError("telephone");
                      }}
                      onBlur={() => validatePhone(telephone)}
                      className={`input w-full pl-10 ${phoneError || fieldErrors.telephone ? "border-red-400 bg-red-50" : ""}`}
                    />
                  </div>
                  {(phoneError || fieldErrors.telephone) && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                      <AlertCircle size={12} />
                      {phoneError || fieldErrors.telephone}
                    </div>
                  )}
                </div>

                {/* button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 btn-primary font-medium"
                >
                  {loading ? "Inscription..." : "S'inscrire"}
                </button>
              </form>

              {/* link back login */}
              <div className="text-center text-sm pt-2">
                <span className="text-gray-500">Déjà un compte ? </span>
                <Link href="/auth/login" className="font-medium text-primary hover:text-accent">
                  Se connecter
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT — Logo identique */}
      <div className="hidden md:flex w-1/2 h-full min-h-screen bg-gradient-to-br from-primary to-accent items-center justify-center">
        <div className="text-white text-center px-10 flex flex-col items-center">
          <div className="flex flex-col items-center justify-center mb-6">
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
          </div>
          <h2 className="text-4xl font-bold mb-3">Rejoignez-nous  </h2>
          <p className="opacity-90 text-lg">Créez votre compte pour accéder aux formations</p>
        </div>
      </div>
    </div>
  );
}