"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  category: "learnerRequests" | "accountChanges" | "imports" | "systemAlerts"; // Catégorie liée aux paramètres
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    title: string,
    message: string,
    type?: Notification["type"],
    category?: Notification["category"]
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const id = String(user.id); // ✅ Toujours en string
        console.log("[NotificationContext] UserId détecté :", id);
        setUserId(id);
      } catch (e) {
        console.error("[NotificationContext] Erreur lecture user", e);
      }
    } else {
      console.warn("[NotificationContext] Aucun utilisateur trouvé dans localStorage");
    }
  }, []);

  useEffect(() => {
    if (userId) {
      const saved = localStorage.getItem(`notifications_${userId}`);
      console.log(`[NotificationContext] Chargement notifs pour ${userId} :`, saved ? "Trouvées" : "Vide");
      if (saved) {
        try {
          setNotifications(JSON.parse(saved));
        } catch {}
      }
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications));
      console.log(`[NotificationContext] Sauvegarde effectuée pour ${userId} (${notifications.length} notifs)`);
    }
  }, [notifications, userId]);

  const addNotification = (
    title: string,
    message: string,
    type: Notification["type"] = "info",
    category: Notification["category"] = "systemAlerts"
  ) => {
    // 1. Récupérer le userId (depuis le state ou direct localStorage si pas encore prêt)
    let currentUserId = userId;
    if (!currentUserId) {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try { currentUserId = JSON.parse(userStr).id; } catch {}
      }
    }

    if (!currentUserId) {
      console.warn("Impossible d'ajouter une notification : UserId non trouvé.");
      return;
    }

    // 2. Vérifier les préférences
    const settingsStr = localStorage.getItem(`notifications_settings_${currentUserId}`);
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr);
        if (settings[category] === false) {
          console.log(`[Notification] Catégorie "${category}" désactivée par l'utilisateur.`);
          return;
        }
      } catch {}
    }

    console.log(`[Notification] Ajout de : ${title} (${category})`);

    const newNotif: Notification = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      category,
      title,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
