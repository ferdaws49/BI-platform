"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { translations } from "./i18n";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminContextType {
  t: typeof translations.fr;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AdminProvider({ children }: { children: ReactNode }) {
  const t = translations.fr; // fixe, plus de state lang

  return (
    <AdminContext.Provider value={{ t }}>
      {children}
    </AdminContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdminContext must be used within AdminProvider");
  }
  return context;
}