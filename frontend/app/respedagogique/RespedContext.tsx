"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { translations } from "./i18n";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RespedContextType {
  t: typeof translations.fr;
}

const RespedContext = createContext<RespedContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function RespedProvider({ children }: { children: ReactNode }) {
  const t = translations.fr; // fixe, plus de state lang

  return (
    <RespedContext.Provider value={{ t }}>
      {children}
    </RespedContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useRespedContext() {
  const context = useContext(RespedContext);
  if (!context) {
    throw new Error("useRespedContext must be used within RespedProvider");
  }
  return context;
}