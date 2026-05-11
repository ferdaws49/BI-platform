import { ApiProperty } from '@nestjs/swagger';

export enum SessionFinancialStatus {
  RENTABLE = 'RENTABLE',
  SEUIL = 'SEUIL',
  DEFICITAIRE = 'DEFICITAIRE',
}

export class FinanceReportKpisDto {
  @ApiProperty()
  revenue: number;

  @ApiProperty()
  cost: number;

  @ApiProperty()
  margin: number;

  @ApiProperty()
  recoveryRate: number;

  @ApiProperty({ description: 'Revenue performance (%) compared to previous period' })
  performanceVsPreviousPeriod: number;
}

export class FinanceReportSessionRowDto {
  @ApiProperty()
  sessionName: string;

  @ApiProperty()
  formationName: string;

  @ApiProperty()
  inscrits: number;

  @ApiProperty()
  capacite: number;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  cost: number;

  @ApiProperty()
  margin: number;

  @ApiProperty()
  recoveryRate: number;

  @ApiProperty()
  fillRate: number;

  @ApiProperty({ enum: SessionFinancialStatus })
  status: SessionFinancialStatus;

  @ApiProperty({ description: 'Prix unitaire appliqué (Session ou Formation)' })
  expectedPerSession: number;
}

export class FinanceReportResponseDto {
  @ApiProperty({ type: FinanceReportKpisDto })
  kpis: FinanceReportKpisDto;

  @ApiProperty({ type: [FinanceReportSessionRowDto] })
  sessions: FinanceReportSessionRowDto[];
}
