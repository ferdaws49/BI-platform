// ─── KPI Types ────────────────────────────────────────────────────────────────
export interface KPIData {
  caRealise: number;
  caPredicted: number;
  riskSessionsCount: number;
  profitMargin: number;
  croissance: number;
}

// ─── Forecast Types ───────────────────────────────────────────────────────────
export interface ForecastPoint {
  month: string;
  historical: number | null;
  predicted: number | null;
}

export type ForecastHorizon = 1 | 3 | 6;

// ─── Risk Session Types ───────────────────────────────────────────────────────
export type RiskLevel = "Safe" | "Medium" | "High";

export interface RiskSession {
  id: string;
  sessionName: string;
  formation: string;
  riskScore: number;
  financialImpact: number;
  status: RiskLevel;
  fillRate: number;      // 0–1  (taux de remplissage)
  profitable: boolean;   // true = rentable
}

// ─── Insight Types ────────────────────────────────────────────────────────────
export type InsightType = "trend" | "risk" | "observation";

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  value?: string;
  direction?: "up" | "down" | "neutral";
}

// ─── Recommendation Types ─────────────────────────────────────────────────────
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

// ─── Filter Types — Global (affect entire dashboard) ──────────────────────────
export type PeriodOption = "Mois" | "Trimestre" | "Année" | "Personnalisé";

export interface FilterState {
  period: PeriodOption;
  dateFrom?: string;   // ISO date string, used when period === "Personnalisé"
  dateTo?: string;
  formationId: string;
  formateurId: string;
  sessionType: "Tout" | "En ligne" | "Présentiel";
}

// ─── Filter Types — Table only (session risk table) ───────────────────────────
export type RiskFilter = "Tout" | "Faible" | "Moyen" | "Élevé";
export type ProfitabilityFilter = "Tout" | "Rentable" | "Non rentable";
export type FillRateFilter = "Tout" | "Faible" | "Moyen" | "Élevé";

export interface TableFilterState {
  risk: RiskFilter;
  profitability: ProfitabilityFilter;
  fillRate: FillRateFilter;
}

// ─── Reference Types ──────────────────────────────────────────────────────────
export interface Formation {
  id: string;
  title: string;
}

export interface Formateur {
  id: string;
  name: string;
}