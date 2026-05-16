"use client";

export type RiskLevel = "critique" | "eleve" | "modere" | "faible";

export interface RiskFactor {
  label: string;
  value: number;   // 0-100, 100 = parfait
  weight: number;
  detail: string;
}

export interface AlertApprenant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  formation: string;
  formateur: string;
  promotion: string;
  riskScore: number;        // 0-100, 100 = risque maximal
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  lastSeen: string;
  phone?: string;
}