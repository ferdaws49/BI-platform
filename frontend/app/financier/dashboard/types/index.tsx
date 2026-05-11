export type PaymentStatus = "Paye" | "Avance" | "Impaye";
export type PeriodFilter = "Mois" | "Trimestre" | "Année" | "Personnalisé";

export interface KPIData {
  
  caRealise: number;
  caFacture: number; 
  croissance: number;
  encoursClient: number;
  tauxMarge: number;
  margeBrute: number;
}

export interface SessionRow {
  sessionId: string;
  session: string;
  date: string;
  formation: string;
  inscrits: number;
  capacite: number;
  caEncaisse: number;  
  cout: number;
  margeNette: number;
  roi: number;
  roiTrend: "up" | "down" | "stable";
  status: PaymentStatus;
}

export interface RevenueMonth {
  month: string;
  caRealise: number;
}

export interface RevenueCost {
  category: string;
  revenue: number;
  cout: number;
}

export interface FormationShare {
  label: string;
  value: number;
  color: string;
}
