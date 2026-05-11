import { ApiProperty } from '@nestjs/swagger';

export class CostBreakEvenDto {
  @ApiProperty({ description: "Nombre d'étudiants nécessaires (arrondi sup.) pour couvrir les coûts" })
  studentsNeeded: number;

  @ApiProperty({ description: 'Prix moyen par étudiant (CA / inscrits) sur la période filtrée' })
  avgPricePerStudent: number;

  @ApiProperty({ enum: ['easy', 'medium', 'hard'], description: 'Facilité d’atteindre le break-even' })
  status: 'easy' | 'medium' | 'hard';

  @ApiProperty({ description: 'Inscrits validés (sessions filtrées)' })
  totalStudents: number;

  @ApiProperty({ description: 'Coût total (sessions filtrées)' })
  totalCost: number;
}

export class CostKpiDto {
  @ApiProperty()
  coutTotal: number;

  @ApiProperty()
  coutFormateurs: number;

  @ApiProperty()
  coutMoyenParSession: number;

  @ApiProperty({ type: CostBreakEvenDto })
  breakEven: CostBreakEvenDto;
}

export class TopFormateurCostDto {
  @ApiProperty()
  formateurId: number;

  @ApiProperty()
  nomFormateur: string;

  @ApiProperty()
  coutTotal: number;

  @ApiProperty()
  nombreSessions: number;

  @ApiProperty()
  coutMoyenParSession: number;
}

export class SessionEfficienceDto {
  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  formation: string;

  @ApiProperty()
  coutTotal: number;

  @ApiProperty()
  coutParEtudiant: number;

  @ApiProperty()
  nombreInscrits: number;
}

export class CostRepartitionDto {
  @ApiProperty({ description: 'Part du coût formateurs (%)' })
  coutFormateursPercent: number;

  @ApiProperty({ description: 'Part du coût logistique (%)' })
  coutLogistiquePercent: number;
}

export class CostRepartitionResponseDto {
  @ApiProperty({ type: CostRepartitionDto })
  repartition: CostRepartitionDto;
}

export class CostTrendPointDto {
  @ApiProperty({ example: '2026-01' })
  mois: string;

  @ApiProperty()
  coutTotal: number;
}

export class CostTrendResponseDto {
  @ApiProperty({ type: [CostTrendPointDto] })
  points: CostTrendPointDto[];
}

export class SessionCostTableRowDto {
  @ApiProperty()
  formation: string;

  @ApiProperty()
  session: string;

  @ApiProperty()
  formateur: string;

  @ApiProperty()
  coutDirectFormateur: number;

  @ApiProperty()
  fraisLogistique: number;

  @ApiProperty()
  coutTotal: number;

  @ApiProperty()
  marge: number;

  @ApiProperty({ description: 'Pourcentage (0–100)' })
  tauxRemplissagePercent: number;

  @ApiProperty({ enum: ['rentable', 'seuil', 'deficitaire'] })
  statutRentabilite: 'rentable' | 'seuil' | 'deficitaire';
}

export class SessionCostTableResponseDto {
  @ApiProperty({ type: [SessionCostTableRowDto] })
  items: SessionCostTableRowDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}