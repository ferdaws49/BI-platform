// ─── 1. Prévision CA ───
export class RevenueForecastDto {
  labels: string[];            // tous les mois (historique + futurs)
  actual: (number | null)[]; // valeurs historiques, null pour le futur
  predicted: (number | null)[]; // null pour l'historique, valeurs prédites
}

// ─── 2. Risque session ───
export enum RiskLevel {
  SAFE = 'SAFE',
  MEDIUM = 'MEDIUM',
  HIGH_RISK = 'HIGH_RISK',
}

export class SessionRiskDto {
  sessionId: string | number;
  sessionName: string;
  formationName: string;
  riskScore: number;   // 0.00 → 1.00
  riskLevel: RiskLevel;
  reason: string;
  currentFillRate: number;
  currentMargin: number;
}

// ─── 3. Prévision trésorerie ───
export class CashflowForecastDto {
  labels: string[];
  inflow: (number | null)[];  // revenus encaissés historiques
  outflow: (number | null)[]; // coûts historiques
  balance: (number | null)[]; // solde historique + prédit
  warning: boolean;           // true si un mois prédit est négatif
  warningMonths: string[];     // mois concernés
}

// ─── 4. Saisonnalité ───
export enum MonthStrength {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export class MonthlyTrendDto {
  month: string;      // ex: "September"
  monthIndex: number; // 0-11
  value: number;      // CA moyen historique
  strength: MonthStrength;
}

export class SeasonalityDto {
  bestMonth: string;
  worstMonth: string;
  monthlyTrend: MonthlyTrendDto[];
}

// ─── Dashboard combiné ───
export class AiDashboardDto {
  revenueForecast: RevenueForecastDto;
  sessionRisks: SessionRiskDto[];
  cashflow: CashflowForecastDto;
  seasonality: SeasonalityDto;
}