"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Phone } from "lucide-react";

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
  const [success, setSuccess] = useState("");
  const [phoneError, setPhoneError] = useState("");


  function validatePhone(phone: string): boolean {
    if (!phone) return true; // Optionnel = vide est OK

    // Supprime espaces, tirets, parenthèses
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");

    // Vérifie que c'est que des chiffres (peut commencer par +)
    const phoneRegex = /^\+?[0-9]{8,15}$/;

    if (!phoneRegex.test(cleaned)) {
      setPhoneError("Numéro invalide. Ex: +216 55 123 456 ou 55123456");
      return false;
    }

    // Vérification longueur minimale (8 chiffres)
    const digitsOnly = cleaned.replace(/\D/g, "");
    if (digitsOnly.length < 8) {
      setPhoneError("Le numéro doit contenir au moins 8 chiffres");
      return false;
    }

    setPhoneError("");
    return true;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(telephone)) {
      return; // Bloque l'envoi si téléphone invalide
    }
    setLoading(true);
    setError("");
    setSuccess("");

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

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de l'inscription");
      }

      setSuccess(data.message || "Inscription réussie, vérifiez votre email");

      // option : redirect after 2s
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);

    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'inscription";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=" w-screen h-screen flex overflow-hidden bg-secondary ">

      {/* LEFT */}
      <div className="w-full md:w-1/2 flex items-center justify-center h-full">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6">

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

            {success && (
              <div className="p-3 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm text-center">
                {success}
              </div>
            )}

            {/* nom + prenom */}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="input w-full"
                required
              />

              <input
                type="text"
                placeholder="Prénom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="input w-full"
                required
              />
            </div>

            {/* email */}
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
              required
            />

            {/* password */}
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
              required
            />

            {/* programme + telephone */}
            <input
              type="text"
              placeholder="Programme"
              value={programme}
              onChange={(e) => setProgramme(e.target.value)}
              className="input w-full"
              required
            />

            <div>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="tel"
                  placeholder="Téléphone (optionnel)"
                  value={telephone}
                  onChange={(e) => {
                    setTelephone(e.target.value);
                    if (phoneError) validatePhone(e.target.value); // Clear error on type
                  }}
                  onBlur={() => validatePhone(telephone)} // Validate on leave
                  className={`input w-full pl-10 ${phoneError ? "border-red-300 bg-red-50" : ""}`}
                />
              </div>
              {phoneError && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <AlertCircle size={12} />
                  {phoneError}
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
            <Link
              href="/auth/login"
              className="font-medium text-primary hover:text-accent"
            >
              Se connecter
            </Link>
          </div>

        </div>
      </div>

      {/* RIGHT */}
      <div className="hidden md:flex w-1/2 h-full bg-gradient-to-br from-primary to-accent items-center justify-center">

        <div className="text-white text-center px-10">
          <h2 className="text-4xl font-bold mb-4">Rejoignez-nous 🚀</h2>
          <p className="opacity-90">
            Créez votre compte pour accéder aux formations
          </p>

          <div className="mt-10 flex justify-center">
            <img
              src="/images/logoreaddly-removebg-preview (2).png"
              alt="Logo"
              className="w-28 h-28 object-contain"
            />
          </div>
        </div>

      </div>

    </div>
  );
}