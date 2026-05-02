import { IsOptional, IsString } from 'class-validator';

export class QualityFilterDto {
  @IsOptional() @IsString() periode?: string;
  @IsOptional() @IsString() formation?: string;
  @IsOptional() @IsString() formateur?: string;
  @IsOptional() @IsString() type?: string;
}

export interface QualityOverviewResponse {
  avgSatisfaction: number;   // moyenne des scores satisfaction (0-100)
  avgReussite: number;       // % apprenants avec note >= 10
  avgAbandon: number;        // % apprenants sans note (non évalués = abandons)
  scoreQualite: number;      // (avgSatisfaction + avgReussite) / 2
  evolutionReussite: {       // for Line chart
    labels: string[];
    data: number[];
  };
}

export interface QualityRowResponse {
  formationId: number;
  formation: string;
  formateur: string;
  satisfaction: number;      // avg score performance (0-100)
  reussite: number;          // % estReussi = true
  abandon: number;           // % apprenants sans note
  type: string;
}

export interface FormateurPerformanceResponse {
  formateur: string;
  score: number;             // avg performance across all formations
}