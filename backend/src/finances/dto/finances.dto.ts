import { IsOptional, IsString, IsIn } from 'class-validator';

export class FinanceFilterDto {
  @IsOptional()
  @IsString()
  @IsIn(['Ce mois', 'Trimestre', 'Semestre','Annee', 'all', ''])
  periode?: string = 'Ce mois';

  @IsOptional()
  @IsString()
  formation?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Présentiel', 'En ligne', 'Tous', ''])
  type?: string = 'Tous';

  @IsOptional()
  @IsString()
  @IsIn(['Actif', 'Terminé', 'Annulé', 'Tous', ''])
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
  type: string;
  statut: string;
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