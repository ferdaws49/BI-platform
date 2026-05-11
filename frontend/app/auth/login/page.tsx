"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // 1. Appel à ton API Auth (Remplace l'URL par la tienne)
      const response = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Email ou mot de passe incorrect");
      }

      // 2. Gestion du succès et redirection selon le rôle
      // Stocke le token JWT dans le localStorage ou un cookie
      // stockage token
      document.cookie = `token=${data.access_token}; path=/; max-age=86400`;
      //after the storage of the token, we can store the role in the cookie as well
      document.cookie = `role=${data.role}; path=/; max-age=86400`;

      //2lines
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("role", data.role);

      // Redirection basée sur le rôle
      if (data.role === "directeur") {
        router.push("/directeur/dashboard");
      } else if (data.role === "resp_pedagogique") {
        router.push("/respedagogique/dashboard");
      } else if (data.role === "admin") {
        router.push("/admin/dashboard");
      } else if(data.role === "apprenant"){
        router.push("/apprenant/dashboard");
      } else if(data.role ==="resp_financier"){
        router.push("/financier/dashboard");
      }
       else {
        router.push("/");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la connexion";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=" w-screen h-screen flex overflow-hidden bg-secondary ">
      {/* LEFT = FORM */}
      <div className="w-full md:w-1/2 flex items-center justify-center h-full">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6 kpi-animate animate-animate-[fadeUp_0.9s_cubic-bezier(0.22,1,0.36,1)_0.3s]">
          {/* En-tête */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">Connexion</h2>
            <p className="text-gray-500 mt-2">Bienvenue sur votre espace</p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Message d'erreur */}
            {error && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            {/* Message de succès */}
            {success && (
              <div className="p-3 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm text-center">
                {success}
              </div>
            )}

            {/* Champ Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full transition-shadow duration-200"
                placeholder="votre@email.com"
              />
            </div>

            {/* Champ Mot de passe */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full transition-shadow duration-200"
                placeholder="••••••••"
              />
            </div>

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center py-3 btn-primary font-medium
              ${loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-md"}`}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Connexion...
                </span>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          {/* Lien vers inscription */}
          <div className="text-center text-sm pt-2">
            <span className="text-gray-500">Pas encore de compte ? </span>
            <Link
              href="/register"
              className="font-medium text-primary hover:text-accent transition-colors duration-200"
            >
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </div>
      {/* RIGHT = DESIGN */}
      <div className="hidden md:flex w-1/2 h-full bg-gradient-to-br from-primary to-accent relative items-center justify-center animate-[slideInRight_1.2s_ease-out]">
        {/* circles design */}
        <div className="absolute w-72 h-72 bg-accent rounded-full -top-10 -right-10 opacity-30"></div>
        <div className="absolute w-72 h-72 bg-primary rounded-full -bottom-10 -left-10 opacity-30"></div>

        {/* content */}
        <div className="text-white text-center px-10">
          <h2 className="text-4xl font-bold mb-4">Bienvenue 👋</h2>
          <p className="opacity-90">
            Connectez-vous pour accéder à votre espace
          </p>

          {/* logo */}
          {/* logo */}
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
