"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      const token = localStorage.getItem("access_token");

      try {
        // Optional: Call logout endpoint if your backend has one
        try {
          await fetch("http://localhost:5000/auth/logout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
          });
        } catch {
          console.log("Backend logout skipped or failed");
        }

        localStorage.removeItem("access_token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        localStorage.removeItem("user_data");
        window.dispatchEvent(new Event("auth-state-changed"));

        // Redirect to login page after 3.5 seconds
        setTimeout(() => {
          router.replace("/auth/login");
        }, 1000);
      } catch (error) {
        console.error("Logout error:", error);
        // Still redirect even if there's an error
        localStorage.removeItem("access_token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        localStorage.removeItem("user_data");
        window.dispatchEvent(new Event("auth-state-changed"));
        setTimeout(() => {
          router.replace("/auth/login");
        }, 1000);
      }
    };

    handleLogout();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 text-4xl">👋</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Déconnexion en cours...
        </h1>
        <p className="text-gray-600">
          Vous serez redirigé vers la page de connexion
        </p>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin">⏳</div>
        </div>
      </div>
    </div>
  );
}
