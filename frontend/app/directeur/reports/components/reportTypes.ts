import type { FilterOptions } from "@/context/FilterContext";

// On réutilise directement le type des filtres globaux
// pour garder une seule source de vérité dans l'application.
export type ReportFilters = FilterOptions;

/**
 * Defines the semantic tone of a trend or metric.
 * Used for consistent styling across the report (colors, icons).
 */
export type TrendTone = "positive" | "warning" | "critical" | "neutral";

/**
 * Data for a specific point in time (e.g., a month).
 * Aggregates core metrics for that specific period.
 */
export type HistoryPoint = {
  label: string;
  enrollments: number;
  revenue: number;
  successRate: number;
  dropoutRate: number;
  satisfaction: number;
};

/**
 * Detailed record for a training program, including its historical performance.
 */
export type TrainingReportRecord = {
  formation: string;
  formateur: string;
  type: "Présentiel" | "En ligne";
  statut: "Actif" | "Terminé" | "Annulé";
  history: HistoryPoint[];
};

/**
 * High-level metric shown in the executive summary cards.
 */
export type SummaryMetric = {
  label: string;
  value: string;
  delta: string; // Textual representation of change (e.g., "+5%")
  tone: TrendTone;
};

/**
 * Qualitative insight derived from data analysis.
 */
export type InsightItem = {
  title: string;
  text: string;
  tone: TrendTone;
  metric?: string; // Optional numeric value to highlight
};

/**
 * Proposed action for the director based on findings.
 */
export type RecommendationItem = {
  title: string;
  description: string;
  owner: string; // Entity responsible for implementation
  impact: string; // Expected outcome
  priority: "Haute" | "Moyenne";
  tone: TrendTone;
};

/**
 * Potential future problem if current trends persist.
 */
export type RiskItem = {
  title: string;
  description: string;
  horizon: string; // Estimated timeframe
  probability: string;
  tone: TrendTone;
};

/**
 * Data structure for the drill-down view (by Course or Trainer).
 * Consolidates multiple metrics into a single row.
 */
export type FocusItem = {
  label: string;
  secondaryLabel: string;
  successRate: number;
  successDelta: number;
  revenue: number;
  revenueDelta: number;
  dropoutRate: number;
  alertCount: number; // Number of critical thresholds crossed
};
