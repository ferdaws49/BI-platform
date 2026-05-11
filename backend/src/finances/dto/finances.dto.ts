import { IsOptional, IsString, IsIn } from 'class-validator';

export class FinanceFilterDto {
  @IsOptional()
  @IsString()
  @IsIn(['Ce mois', 'Trimestre', 'Semestre', 'Annee', 'all', ''])
  periode?: string = 'Ce mois';

  @IsOptional()
  @IsString()
  formation?: string;

  // ✅ Corrigé : valeurs du enum SessionType
  @IsOptional()
  @IsString()
  @IsIn(['présentiel', 'en_ligne', 'Tous', ''])
  type?: string = 'Tous';

  // ✅ Corrigé : valeurs du enum Formation.statut
  @IsOptional()
  @IsString()
  @IsIn(['active', 'completed', 'Tous', ''])
  statut?: string = 'Tous';
}

export interface FinanceOverviewResponse {
  revenus: number;
  couts: number;
  profit: number;
  marge: number;
  topFormation: { nom: string; profit: number };
  impayes: { count: number; montantTotal: number };
  evolutionCA: { labels: string[]; data: number[] };
}

export interface FormationProfitabilityRow {
  formationId: number;
  titre: string;
  type: string;      // 'présentiel' | 'en_ligne'
  statut: string;    // 'active' | 'completed'
  revenus: number;
  couts: number;
  profit: number;
  marge: number;
}

export interface ImpayeItem {
  id: number;
  formation: string;
  montant: number;
  date: Date;
  joursRetard: number;
}