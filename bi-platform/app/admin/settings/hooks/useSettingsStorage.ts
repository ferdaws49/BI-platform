"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEYS = {
  DATA_REFRESH: "dataRefresh-admin",
  NOTIFICATIONS: "notifications-admin",
} as const;

export function useSettingsStorage<T>(
  key: (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS],
  initialValue: T
) {
  const [value, setValue] = useState<T>(initialValue);
  const [isSaved, setIsSaved] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setValue(JSON.parse(saved));
      } catch {
        setValue(initialValue);
      }
    }
  }, [key, initialValue]);

  const save = useCallback(() => {
    localStorage.setItem(key, JSON.stringify(value));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  }, [key, value]);

  return {
    value,
    setValue,
    save,
    isSaved,
  };
}

// Specific hooks for common settings
export function useDataRefreshSetting() {
  return useSettingsStorage(STORAGE_KEYS.DATA_REFRESH, "5min");
}

export function useNotificationSettings() {
  const initialNotifs = {
    learnerRequests: true,
    accountChanges: true,
    imports: true,
    systemAlerts: true,
  };
  return useSettingsStorage(STORAGE_KEYS.NOTIFICATIONS, initialNotifs);
}