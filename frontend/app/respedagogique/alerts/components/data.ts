"use client";

import { RiskLevel, AlertApprenant, RiskFactor } from "./types";

export const STATIC_ALERTS: AlertApprenant[] = [
  {
    id: "1",
    nom: "Ben Salah",
    prenom: "Rami",
    email: "rami.bensalah@email.com",
    formation: "Développement Web Full Stack",
    formateur: "Karim Trabelsi",
    promotion: "Promo A 2025",
    riskScore: 87,
    riskLevel: "critique",
    lastSeen: "Il y a 12 jours",
    phone: "+216 55 123 456",
    factors: [
      { label: "Présence", value: 28, weight: 40, detail: "4 absences consécutives ce mois" },
      { label: "Notes", value: 32, weight: 35, detail: "Moyenne passée de 15.2 → 6.8 (−8.4 pts)" },
      { label: "Satisfaction", value: 40, weight: 15, detail: "Dernier feedback: 2/5 ⭐" },
      { label: "Paiements", value: 100, weight: 10, detail: "À jour" },
    ],
  },
  {
    id: "2",
    nom: "Gharbi",
    prenom: "Ines",
    email: "ines.gharbi@email.com",
    formation: "Data Science & IA",
    formateur: "Sonia Mansouri",
    promotion: "Promo B 2025",
    riskScore: 74,
    riskLevel: "eleve",
    lastSeen: "Il y a 5 jours",
    phone: "+216 22 987 654",
    factors: [
      { label: "Présence", value: 45, weight: 40, detail: "3 absences sur les 5 dernières séances" },
      { label: "Notes", value: 50, weight: 35, detail: "Tendance stable mais sous la moyenne: 9.1/20" },
      { label: "Satisfaction", value: 60, weight: 15, detail: "Pas de feedback depuis 3 semaines" },
      { label: "Paiements", value: 30, weight: 10, detail: "Retard de paiement: 45 jours" },
    ],
  },
  {
    id: "3",
    nom: "Ammar",
    prenom: "Yassine",
    email: "yassine.ammar@email.com",
    formation: "Cybersécurité Avancée",
    formateur: "Hatem Bouaziz",
    promotion: "Promo A 2025",
    riskScore: 68,
    riskLevel: "eleve",
    lastSeen: "Il y a 3 jours",
    factors: [
      { label: "Présence", value: 55, weight: 40, detail: "2 absences ce mois, pas de justificatif" },
      { label: "Notes", value: 42, weight: 35, detail: "Baisse progressive: 14 → 11 → 8 /20" },
      { label: "Satisfaction", value: 80, weight: 15, detail: "Feedback positif mais rare" },
      { label: "Paiements", value: 75, weight: 10, detail: "Paiement partiel reçu" },
    ],
  },
  {
    id: "4",
    nom: "Chaker",
    prenom: "Mariem",
    email: "mariem.chaker@email.com",
    formation: "Développement Web Full Stack",
    formateur: "Karim Trabelsi",
    promotion: "Promo C 2025",
    riskScore: 52,
    riskLevel: "modere",
    lastSeen: "Hier",
    factors: [
      { label: "Présence", value: 70, weight: 40, detail: "1 absence justifiée ce mois" },
      { label: "Notes", value: 48, weight: 35, detail: "Note faible: 8.5/20 au dernier devoir" },
      { label: "Satisfaction", value: 65, weight: 15, detail: "Feedback mitigé sur la charge de travail" },
      { label: "Paiements", value: 100, weight: 10, detail: "À jour" },
    ],
  },
  {
    id: "5",
    nom: "Dridi",
    prenom: "Hamza",
    email: "hamza.dridi@email.com",
    formation: "Marketing Digital",
    formateur: "Leila Khouja",
    promotion: "Promo B 2025",
    riskScore: 48,
    riskLevel: "modere",
    lastSeen: "Il y a 2 jours",
    factors: [
      { label: "Présence", value: 72, weight: 40, detail: "Présence correcte mais irrégulière" },
      { label: "Notes", value: 55, weight: 35, detail: "Moyenne: 10.2/20, en légère baisse" },
      { label: "Satisfaction", value: 30, weight: 15, detail: "Insatisfaction exprimée: manque de pratique" },
      { label: "Paiements", value: 100, weight: 10, detail: "À jour" },
    ],
  },
  {
    id: "6",
    nom: "Miled",
    prenom: "Sara",
    email: "sara.miled@email.com",
    formation: "Data Science & IA",
    formateur: "Sonia Mansouri",
    promotion: "Promo A 2025",
    riskScore: 31,
    riskLevel: "faible",
    lastSeen: "Aujourd'hui",
    factors: [
      { label: "Présence", value: 88, weight: 40, detail: "Assiduité excellente" },
      { label: "Notes", value: 62, weight: 35, detail: "Moyenne: 11.5/20, stable" },
      { label: "Satisfaction", value: 80, weight: 15, detail: "Feedback globalement positif" },
      { label: "Paiements", value: 60, weight: 10, detail: "Légère irrégularité" },
    ],
  },
];

export const FORMATIONS = ["Toutes", ...Array.from(new Set(STATIC_ALERTS.map(a => a.formation)))];

export const FORMATIONS_SHORT: Record<string, string> = {
  "Toutes": "Toutes",
  "Développement Web Full Stack": "Dev Web",
  "Data Science & IA": "Data IA",
  "Cybersécurité Avancée": "Cybersec",
  "Marketing Digital": "Marketing",
};

export const RISK_LEVELS = ["Tous", "critique", "eleve", "modere", "faible"];

export const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critique: { label: "Critique",  color: "#991b1b", bg: "#fef2f2", border: "#fca5a5", dot: "#dc2626" },
  eleve:    { label: "Élevé",     color: "#92400e", bg: "#fffbeb", border: "#fcd34d", dot: "#d97706" },
  modere:   { label: "Modéré",    color: "#1e40af", bg: "#eff6ff", border: "#93c5fd", dot: "#3b82f6" },
  faible:   { label: "Faible",    color: "#166534", bg: "#f0fdf4", border: "#86efac", dot: "#22c55e" },
};

export const AVATAR_COLORS = [
  "#4f46e5","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#0284c7",
];

export function computeRiskScore(factors: RiskFactor[]): number {
  const total = factors.reduce((acc, f) => acc + (100 - f.value) * f.weight, 0);
  return Math.round(total / 100);
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return "critique";
  if (score >= 55) return "eleve";
  if (score >= 35) return "modere";
  return "faible";
}

export function initials(prenom: string, nom: string) {
  return `${prenom[0]}${nom[0]}`.toUpperCase();
}

export function avatarColor(id: string) {
  const idx = parseInt(id) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}