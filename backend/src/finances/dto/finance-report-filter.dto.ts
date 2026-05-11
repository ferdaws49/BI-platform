import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum FinanceReportPeriod {
  CURRENT_MONTH = 'current_month',
  CURRENT_QUARTER = 'current_quarter',
  CURRENT_YEAR = 'current_year',
  CUSTOM = 'custom',
}

export class FinanceReportFilterDto {
  @ApiPropertyOptional({
    enum: FinanceReportPeriod,
    default: FinanceReportPeriod.CURRENT_MONTH,
  })
  @IsOptional()
  @IsEnum(FinanceReportPeriod)
  period?: FinanceReportPeriod = FinanceReportPeriod.CURRENT_MONTH;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value?.trim())
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value?.trim())
  endDate?: string;

  
}
