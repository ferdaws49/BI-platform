"use client";

import { useEffect, useRef } from "react";

/**
 * Hook pour déclencher un rafraîchissement automatique des données
 * @param callback La fonction à appeler (ex: fetchUsers, fetchStats)
 * @param enabled Si le rafraîchissement est activé
 * @param role Le rôle de l'utilisateur (admin, directeur, resped) pour lire la bonne préférence
 */
export function useAutoRefresh(
  callback: () => void,
  enabled: boolean = true,
  role: "admin" | "directeur" | "resped" = "admin",
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    // 1. Lire la préférence depuis localStorage selon le rôle
    const refreshPref = localStorage.getItem(`dataRefresh-${role}`) || "5min";

    // 2. Convertir en millisecondes
    const intervalMap: Record<string, number> = {
      "1min": 60 * 1000,
      "5min": 5 * 60 * 1000,
      "15min": 15 * 60 * 1000,
      "30min": 30 * 60 * 1000,
    };

    const ms = intervalMap[refreshPref] || 5 * 60 * 1000;

    // 3. Configurer l'intervalle
    console.log(`[AutoRefresh] Activé toutes les ${refreshPref} (${ms}ms)`);
    const id = setInterval(() => {
      console.log("[AutoRefresh] Exécution du rafraîchissement...");
      savedCallback.current();
    }, ms);

    return () => clearInterval(id);
  }, [enabled, role]);
}
