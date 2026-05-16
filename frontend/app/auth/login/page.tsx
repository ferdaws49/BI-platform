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
      const response = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Email ou mot de passe incorrect");
      }

      document.cookie = `token=${data.access_token}; path=/; max-age=86400`;
      document.cookie = `role=${data.user.role}; path=/; max-age=86400`;
      document.cookie = `userId=${data.user.id}; path=/; max-age=86400`;

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("auth-state-changed"));

      const role = data.user.role;
      if (role === "directeur") {
        router.push("/directeur/dashboard");
      } else if (role === "resp_pedagogique") {
        router.push("/respedagogique/dashboard");
      } else if (role === "admin") {
        router.push("/admin/dashboard");
      }  else if (role === "apprenant") {
        // ✅ NOUVEAU : Vérifier si l'apprenant a des inscriptions
        await redirectApprenant(data.access_token);
      } else if (role === "financier" || role === "resp_financier") {
        router.push("/financier/dashboard");
      } else if(role === "financier" || role ==="resp_financier" ){
        router.push("/financier/dashboard");
      } else {
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

  const redirectApprenant = async (token: string) => {
    try {
      const res = await fetch("http://localhost:5000/inscriptions/student", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Si erreur 401/403 → token invalide, rediriger login
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.clear();
          router.push("/login");
          return;
        }
        // Autre erreur → Welcome Page par sécurité
        router.push("/apprenant");
        return;
      }

      const text = await res.text();
      const registrations = text ? JSON.parse(text) : [];

      if (Array.isArray(registrations) && registrations.length > 0) {
        // 🎯 A des inscriptions → Dashboard
        console.log("Apprenant a", registrations.length, "inscriptions → Dashboard");
        router.push("/apprenant/dashboard");
      } else {
        // 🎯 0 inscription → Welcome Page (catalogue)
        console.log("Nouvel apprenant, 0 inscription → Welcome Page");
        router.push("/apprenant");
      }
    } catch (err) {
      console.error("Erreur check inscriptions:", err);
      // En cas d'erreur réseau → Welcome Page
      router.push("/apprenant");
    }
  };

  return (
    <div className=" w-screen h-screen flex overflow-hidden bg-secondary ">
      {/* LEFT */}
      <div className="w-full md:w-1/2 flex items-center justify-center h-full">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft p-8 space-y-6">

          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">Connexion</h2>
            <p className="text-gray-500 mt-2">Bienvenue sur votre espace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 btn-primary font-medium"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          {/* 🔥 NEW LINKS SECTION */}
          <div className="text-center text-sm pt-2 space-y-2">

            {/* Forgot password */}
            <Link
              href="/auth/forgot-pass"
              className="text-primary hover:text-accent transition-colors block"
            >
              Mot de passe oublié ?
            </Link>

            {/* Register */}
            <div>
              <span className="text-gray-500">Vous n'avez pas de compte ? </span>
              <Link
                href="/auth/register"
                className="font-medium text-primary hover:text-accent"
              >
                S'inscrire
              </Link>
            </div>

          </div>

        </div>
      </div>

      {/* RIGHT unchanged */}
      <div className="hidden md:flex w-1/2 h-full bg-gradient-to-br from-primary to-accent items-center justify-center">
        <div className="text-white text-center px-10">
          <h2 className="text-4xl font-bold mb-4">Bienvenue 👋</h2>
          <p className="opacity-90">
            Connectez-vous pour accéder à votre espace
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