// types/index.ts

// ─── KPI ─────────────────────────────────────────────
export interface KPIData {
  caRealise: number;
  caPredicted: number;
  riskSessionsCount: number;
  profitMargin: number;
  croissance: number;
}

// ─── Forecast (Graphique CA) ─────────────────────────
export interface ForecastPoint {
  month: string;          // ex: "2025-01"
  historical: number | null;
  predicted: number | null;
}

export type ForecastHorizon = 1 | 3 | 6;

// ─── Risque / Table ────────────────────────────────────
export type RiskLevel = "Safe" | "Medium" | "High";

export interface RiskSession {
  id: string;
  sessionName: string;
  formation: string;
  riskScore: number;      // 0 → 1
  financialImpact: number;
  status: RiskLevel;
  fillRate: number;       // 0 → 1
  profitable: boolean;
}

// ─── Insights IA ─────────────────────────────────────
export type InsightType = "trend" | "risk" | "observation";

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  value?: string;
  direction?: "up" | "down" | "neutral";
}

// ─── Recommandations ───────────────────────────────────
export type RecommendationAction = "cancel" | "promote" | "reduce-costs" | "watch";

export interface Recommendation {
  id: string;
  action: RecommendationAction;
  title: string;
  description: string;
  session?: string;
  impact: string;
  priority: "high" | "medium" | "low";
}

// ─── Filtres Globaux (barre du haut) ─────────────────
export type PeriodOption = "Mois" | "Trimestre" | "Année" | "Personnalisé";

export interface FilterState {
  period: PeriodOption;
  dateFrom?: string;      // YYYY-MM-DD
  dateTo?: string;
  formationId: string;   // "all" ou "1", "2"...
  formateurId: string;    // "all" ou "1", "2"...
  sessionType: "Tout" | "En ligne" | "Présentiel";
}

// ─── Filtres Table (sessions à risque) ─────────────────
export type RiskFilter = "Tout" | "Faible" | "Moyen" | "Élevé";
export type ProfitabilityFilter = "Tout" | "Rentable" | "Non rentable";
export type FillRateFilter = "Tout" | "Faible" | "Moyen" | "Élevé";

export interface TableFilterState {
  risk: RiskFilter;
  profitability: ProfitabilityFilter;
  fillRate: FillRateFilter;
}

// ─── Références (listes déroulantes) ───────────────────
export interface Formation {
  id: string;
  title: string;
}

export interface Formateur {
  id: string;
  name: string;
}