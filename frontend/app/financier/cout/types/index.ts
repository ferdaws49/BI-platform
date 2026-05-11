// ── Enums ──────────────────────────────────────────────────
export type PeriodeFilter    = "Mois" | "Trimestre" | "Année" | "Personnalisé";
export type RentabiliteStatut = "rentable" | "seuil" | "deficitaire";
export type RemplissageFilter = "all" | "low" | "mid" | "high";
export type NiveauCout        = "all" | "petit" | "moyen" | "eleve";




// ── Entities ───────────────────────────────────────────────
export interface Formateur {
  id: string;
  nom: string;
  initiales: string;
  couleur: string;
}

export interface Formation {
  id: string;
  nom: string;
  categorie: string;
  prixUnite: number;
}

// ── Row data ───────────────────────────────────────────────
export interface SessionCoutRow {
  id: string;
  sessionNom: string;
  formation: string;
  formationId: string;
  formateur: string;
  formateurId: string;
  dateDebut: string;
  inscrits: number;
  capacite: number;
  coutDirectFormateur: number;
  fraisAnnexes: number;
  coutTotal: number;
  ca: number;
  marge: number;
  statut: RentabiliteStatut;
}

// ── Chart data ─────────────────────────────────────────────
export interface FormateurCoutPoint {
  formateur: string;
  coutTotal: number;
  nbSessions: number;
  couleur: string;
}

export interface TrendPoint {
  mois: string;
  coutTotal: number;
  coutParEtudiant: number;
}

export interface RepartitionDepense {
  label: string;
  value: number;
  couleur: string;
}

// ── KPI ────────────────────────────────────────────────────
export interface KpiCoutsData {
  chiffreAffaires: number;
  coutTotal: number;
  coutFormateurs: number;
  coutMoyenSession: number;
  breakEvenStudents: number;
  prixMoyenFormation: number;
}

// ── Backend DTOs ───────────────────────────────────────────
export interface CostBreakEvenDto {
  studentsNeeded: number;
  avgPricePerStudent: number;
  status: "easy" | "medium" | "hard";
  totalStudents: number;
  totalCost: number;
}

/**
 * Matches the NestJS CostKpiDto exactly.
 * coutTotal was previously missing here, causing the KPI card to show 0.
 */
export interface CostKpiDto {
  coutTotal: number;           // ← was missing; backend always returns this
  coutFormateurs: number;
  coutMoyenParSession: number;
  breakEven: CostBreakEvenDto;
}

export interface TopFormateurCostDto {
  formateurId: number;
  nomFormateur: string;
  coutTotal: number;
  nombreSessions: number;
  coutMoyenParSession: number;
}

export interface SessionEfficienceDto {
  sessionId: number;
  formation: string;
  coutTotal: number;
  coutParEtudiant: number;
  nombreInscrits: number;
}

export interface CostRepartitionDto {
  coutFormateursPercent: number;
  coutLogistiquePercent: number;
}

export interface CostRepartitionResponseDto {
  repartition: CostRepartitionDto;
}

export interface CostTrendPointDto {
  mois: string;
  coutTotal: number;
}

export interface CostTrendResponseDto {
  points: CostTrendPointDto[];
}

/**
 * Matches NestJS SessionCostTableRowDto.
 * Note: the backend does not return a startDate per row — dateDebut in
 * SessionCoutRow is derived from the session title context only.
 */
export interface SessionCostTableRowDto {
  sessionId: string
  formation: string;
  session: string;
  formateur: string;
  coutDirectFormateur: number;
  fraisLogistique: number;
  coutTotal: number;
  marge: number;
  tauxRemplissagePercent: number;
  statutRentabilite: "rentable" | "seuil" | "deficitaire";
}

export interface SessionCostTableResponseDto {
  items: SessionCostTableRowDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Pagination metadata (used by page.tsx to drive DetailTable) ──
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}