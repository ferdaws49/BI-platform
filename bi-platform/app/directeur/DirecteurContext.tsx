"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { translations } from "./i18n";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DirecteurContextType {
  t: typeof translations.fr;
}

const DirecteurContext = createContext<DirecteurContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function DirecteurProvider({ children }: { children: ReactNode }) {
  const t = translations.fr; // fixe, plus de state lang

  return (
    <DirecteurContext.Provider value={{ t }}>
      {children}
    </DirecteurContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useDirecteurContext() {
  const context = useContext(DirecteurContext);
  if (!context) {
    throw new Error("useDirecteurContext must be used within DirecteurProvider");
  }
  return context;
}