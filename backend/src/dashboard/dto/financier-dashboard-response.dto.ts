import { ApiProperty } from '@nestjs/swagger';
import { PaiementStatus } from 'src/utils/enums';
export class DashboardKpisDto {
  @ApiProperty()
  caRealise: number;
  @ApiProperty()
  caFacture: number;
  @ApiProperty()
  encoursClient: number;
  @ApiProperty()
  margeBrute: number;
  @ApiProperty()
  tauxMarge: number;
  @ApiProperty({ description: 'Croissance du CA realise (%) vs periode precedente' })
  croissance: number;
}
export class MonthlyRevenueItemDto {
  @ApiProperty({ example: '2026-04' })
  month: string;
  @ApiProperty()
  caRealise: number;
}


export class CategoryRevenueCostItemDto {
  @ApiProperty()
  categorie: string;
  @ApiProperty()
  revenue: number;
  @ApiProperty()
  cout: number;
}
export class FormationRevenueItemDto {
  @ApiProperty()
  formationId: number;
  @ApiProperty()
  formationTitle: string;
  @ApiProperty()
  caRealise: number;
}


export class SessionPerformanceRowDto {
  @ApiProperty()
  sessionId: number;
  @ApiProperty()
  session: string;
  @ApiProperty()
  formation: string;
  @ApiProperty({ example: '2026-03-01' })
  date: string;
  @ApiProperty()
  inscrits: number;
  @ApiProperty()
  capacite: number;
  @ApiProperty()
  caEncaisse: number;
  @ApiProperty()
  cout: number;
  @ApiProperty()
  margeNette: number;
  @ApiProperty()
  roi: number;
  @ApiProperty({ enum: PaiementStatus })
  status: PaiementStatus;
}
export class SessionsPerformanceResponseDto {
  @ApiProperty({ type: [SessionPerformanceRowDto] })
  items: SessionPerformanceRowDto[];
  @ApiProperty()
  page: number;
  @ApiProperty()
  limit: number;
  @ApiProperty()
  total: number;
  @ApiProperty()
  totalPages: number;
}
