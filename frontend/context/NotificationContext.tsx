"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface Notification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  category:
    | "learnerRequests"
    | "accountChanges"
    | "imports"
    | "systemAlerts"
    | "sessionAlerts"
    | "learnerRiskAlerts"
    | "trainerUpdates"
    | "feedbackAlerts";
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

const AUTH_STATE_CHANGED_EVENT = "auth-state-changed";
// Préfixe commun utilisé pour stocker les notifications séparément par utilisateur.
const NOTIFICATION_STORAGE_PREFIX = "notifications_";

// Lit l'utilisateur connecté depuis localStorage et retourne son id sous forme de chaîne.
const readStoredUserId = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) {
    return null;
  }

  try {
    const user = JSON.parse(userStr);
    return user?.id != null ? String(user.id) : null;
  } catch (error) {
    console.error("[NotificationContext] Error while reading user", error);
    return null;
  }
};

// Construit la clé locale dédiée aux notifications d'un utilisateur donné.
const getNotificationStorageKey = (currentUserId: string | null) =>
  currentUserId ? `${NOTIFICATION_STORAGE_PREFIX}${currentUserId}` : null;

// Charge les notifications persistées pour l'utilisateur actif.
const readStoredNotifications = (currentUserId: string | null) => {
  const storageKey = getNotificationStorageKey(currentUserId);
  if (!storageKey) {
    return [];
  }

  const saved = localStorage.getItem(storageKey);
  console.log(
    `[NotificationContext] Loading notifications for ${currentUserId}:`,
    saved ? "found" : "empty"
  );

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved) as Notification[];
  } catch (error) {
    console.error(
      `[NotificationContext] Error while parsing notifications for ${currentUserId}`,
      error
    );
    return [];
  }
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Sauvegarde explicitement la liste dans localStorage pour éviter toute désynchronisation.
  const persistNotifications = (
    targetUserId: string,
    nextNotifications: Notification[]
  ) => {
    localStorage.setItem(
      getNotificationStorageKey(targetUserId)!,
      JSON.stringify(nextNotifications)
    );
    console.log(
      `[NotificationContext] Saved notifications for ${targetUserId} (${nextNotifications.length})`
    );
  };

  // Point central pour modifier les notifications en garantissant qu'on travaille
  // toujours sur le bon utilisateur, même après un changement de session.
  const updateNotificationsForActiveUser = (
    updater: (currentNotifications: Notification[]) => Notification[]
  ) => {
    const currentUserId = readStoredUserId() ?? userId;

    if (!currentUserId) {
      console.warn("[NotificationContext] Cannot update notifications without an active user.");
      return;
    }

    if (currentUserId !== userId) {
      setUserId(currentUserId);
    }

    setNotifications((prev) => {
      const baseNotifications =
        currentUserId === userId ? prev : readStoredNotifications(currentUserId);
      const nextNotifications = updater(baseNotifications);

      persistNotifications(currentUserId, nextNotifications);
      return nextNotifications;
    });
  };

  useEffect(() => {
    // Re-synchronise l'état React avec le user courant et ses notifications stockées.
    const syncUserFromStorage = () => {
      const nextUserId = readStoredUserId();
      const nextNotifications = readStoredNotifications(nextUserId);

      setUserId((prevUserId) => {
        if (prevUserId !== nextUserId) {
          console.log("[NotificationContext] Active user changed:", prevUserId, "->", nextUserId);
        }
        return prevUserId === nextUserId ? prevUserId : nextUserId;
      });

      setNotifications(nextNotifications);
    };

    // Écoute les changements inter-onglets ou les modifications locales pertinentes.
    const handleStorage = (event: StorageEvent) => {
      const activeUserId = readStoredUserId();
      const activeNotificationKey = getNotificationStorageKey(activeUserId);

      if (
        event.key === "user" ||
        event.key === activeNotificationKey ||
        event.key === null
      ) {
        syncUserFromStorage();
      }
    };

    // Quand l'onglet redevient visible, on recharge pour éviter un affichage obsolète.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncUserFromStorage();
      }
    };

    syncUserFromStorage();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", syncUserFromStorage);
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncUserFromStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncUserFromStorage);
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncUserFromStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const addNotification = (
    title: string,
    message: string,
    type: Notification["type"] = "info",
    category: Notification["category"] = "systemAlerts"
  ) => {
    // On relit l'utilisateur courant au moment exact de l'ajout pour éviter
    // d'ajouter une notification à un ancien utilisateur resté en mémoire.
    const currentUserId = readStoredUserId() ?? userId;

    if (!currentUserId) {
      console.warn("[NotificationContext] Cannot add notification without an active user.");
      return;
    }

    // Si la catégorie est désactivée dans les préférences, on ignore la notification.
    const settingsStr = localStorage.getItem(`notifications_settings_${currentUserId}`);
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr);
        if (settings[category] === false) {
          console.log(`[NotificationContext] Category "${category}" is disabled for user ${currentUserId}.`);
          return;
        }
      } catch {
        // Ignore invalid settings and continue to show the notification.
      }
    }

    const newNotification: Notification = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      category,
      title,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    console.log(
      `[NotificationContext] Adding notification "${title}" for user ${currentUserId}.`
    );
    updateNotificationsForActiveUser((prev) => [newNotification, ...prev]);
  };

  // Marque une seule notification comme lue.
  const markAsRead = (id: string) => {
    updateNotificationsForActiveUser((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };

  // Marque toute la liste comme lue.
  const markAllAsRead = () => {
    updateNotificationsForActiveUser((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true }))
    );
  };

  // Vide complètement l'historique pour l'utilisateur actif.
  const clearAll = () => {
    updateNotificationsForActiveUser(() => []);
  };

  // Compteur affiché sur la cloche des notifications.
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
