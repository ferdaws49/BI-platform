export type PaymentStatus = "Payé" | "Partiel" | "Impayé";
export type PeriodFilter = "7j" | "30j" | "Trimestre" | "Année" | "Personnalisé";

export interface Formation {
  id: string;
  name: string;
  category: string;
  price: number;
  color: string;
}
export interface RevEvolution {
  months: string[];
  series: { formationId: number; formationTitle: string; monthlyRevenue: number[] }[];
}

export interface TopForm { formationId: number; formationTitle: string; caRealise: number; }
export interface CatShare { category: string; revenue: number; percent: number; }

export interface TableRow {
  sessionId: string;
  session: string;
  formation: string;
  formationId: string;
  date: string;
  inscrits: number;
  capacite: number;
  prix: number;
  caEncaisse: number;
  variation: { color: 'green'|'red'|'neutral'; variationPercent: number };
}
export interface TableResp { items: TableRow[]; page: number; limit: number; total: number; totalPages: number; }

export interface Paiement {
  id: number;
  apprenantId: string;
  apprenantNom: string;
  apprenantInitiales: string;
  session: string;
  sessionId: string;
  apprenantPhoto?: string;
  formation: string;
  formationId: string;
  montantTotal: number;
  montantEncaisse: number;
  date: string;
  statut: PaymentStatus;
}

export interface Apprenant {
  id: number;
  nom: string;
  initiales: string;
}

export interface RevenuePoint {
  month: string;
  [formationId: string]: number | string;
}

export interface BubblePt {
  formationId: number;
  formationTitle: string;
  inscriptions: number;
  revenue: number;
  bubbleSize: number;
   bubbleMetric: 'margin' | 'price';
}

