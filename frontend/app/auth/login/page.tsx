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
      } else if (role === "apprenant") {
        // ✅ NOUVEAU : Vérifier si l'apprenant a des inscriptions
        await redirectApprenant(data.access_token);
      } else if (role === "financier" || role === "resp_financier") {
        router.push("/financier/dashboard");
      } else if (role === "financier" || role === "resp_financier") {
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
        console.log(
          "Apprenant a",
          registrations.length,
          "inscriptions → Dashboard",
        );
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
              href="/auth/forgot-password"
              className="text-primary hover:text-accent transition-colors block"
            >
              Mot de passe oublié ?
            </Link>

            {/* Register */}
            <div>
              <span className="text-gray-500">
                Vous n'avez pas de compte ?{" "}
              </span>
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
      <div className="hidden md:flex w-1/2 h-full min-h-screen bg-gradient-to-br from-primary to-accent items-center justify-center">
        <div className="text-white text-center px-10 flex flex-col items-center">
          {/* === LOGO EN HAUT === */}
          <div className="flex flex-col items-center justify-center mb-6">
            <svg
              viewBox="0 0 600 600"
              className="w-44 h-44 drop-shadow-2xl"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feFlood
                    floodColor="white"
                    floodOpacity="0.4"
                    result="color"
                  />
                  <feComposite
                    in="color"
                    in2="blur"
                    operator="in"
                    result="shadow"
                  />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter
                  id="glow-strong"
                  x="-40%"
                  y="-40%"
                  width="180%"
                  height="180%"
                >
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feFlood
                    floodColor="white"
                    floodOpacity="0.6"
                    result="color"
                  />
                  <feComposite
                    in="color"
                    in2="blur"
                    operator="in"
                    result="shadow"
                  />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <linearGradient
                  id="circleGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
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
              <circle
                cx="195"
                cy="235"
                r="7"
                fill="white"
                filter="url(#glow-strong)"
              />
              <circle
                cx="185"
                cy="295"
                r="7"
                fill="white"
                filter="url(#glow-strong)"
              />
              <circle
                cx="210"
                cy="355"
                r="7"
                fill="white"
                filter="url(#glow-strong)"
              />
              <circle
                cx="255"
                cy="320"
                r="7"
                fill="white"
                filter="url(#glow-strong)"
              />

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
              <circle
                cx="360"
                cy="340"
                r="5"
                fill="white"
                filter="url(#glow-strong)"
              />
              <circle
                cx="405"
                cy="355"
                r="5"
                fill="white"
                filter="url(#glow-strong)"
              />
              <circle
                cx="460"
                cy="280"
                r="5"
                fill="white"
                filter="url(#glow-strong)"
              />

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
          </div>

          {/* === TEXTE EN BAS === */}
          <h2 className="text-4xl font-bold mb-3">Bienvenue 👋</h2>
          <p className="opacity-90 text-lg">
            Connectez-vous pour accéder à votre espace
          </p>
        </div>
      </div>
    </div>
  );
}
