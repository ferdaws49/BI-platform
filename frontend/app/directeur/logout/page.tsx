"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Remove access token from localStorage
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_data");

        // Optional: Call logout endpoint if your backend has one
        try {
          await fetch("http://localhost:5000/auth/logout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          });
        } catch (error) {
          console.log("Backend logout skipped or failed");
        }

        // Redirect to login page after 3.5 seconds
        setTimeout(() => {
          router.push("/auth/login");
        }, 1000);
      } catch (error) {
        console.error("Logout error:", error);
        // Still redirect even if there's an error
        setTimeout(() => {
          router.push("/auth/login");
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
