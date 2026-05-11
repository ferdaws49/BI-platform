import type { FilterOptions } from "@/context/FilterContext";

export type ReportFilters = FilterOptions;

export type TrendTone = "positive" | "warning" | "critical" | "neutral";

export type TrendCard = {
  label: string;
  headline: string;
  sub: string;
  pillText: string;
  tone: TrendTone;
};

export type HistoryPoint = {
  label: string;
  enrollments: number;
  revenue: number;
  successRate: number;
  dropoutRate: number;
  satisfaction: number;
};

export type TrainingReportRecord = {
  formation: string;
  formateur: string;
  type: "Présentiel" | "En ligne";
  statut: "Actif" | "Terminé" | "Annulé";
  history: HistoryPoint[];
};

export type SummaryMetric = {
  label: string;
  value: string;
  delta: string;
  tone: TrendTone;
};

export type InsightItem = {
  title: string;
  text: string;
  tone: TrendTone;
  metric?: string;
};

export type RecommendationItem = {
  title: string;
  description: string;
  owner: string;
  impact: string;
  priority: "Haute" | "Moyenne";
  tone: TrendTone;
};

export type RiskItem = {
  title: string;
  description: string;
  horizon: string;
  probability: string;
  tone: TrendTone;
};

export type FocusItem = {
  label: string;
  secondaryLabel: string;
  successRate: number;
  successDelta: number;
  revenue: number;
  revenueDelta: number;
  dropoutRate: number;
  alertCount: number;
};
