import { IsOptional, IsInt, IsString, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class PredictFilterDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;   // Format: "2026-01-01"

  @IsOptional()
  @IsDateString()
  dateTo?: string;     // Format: "2026-12-31"


  @IsOptional()
  @IsInt()
  @Type(() => Number)
  formationId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  formateurId?: number;

  @IsOptional()
  @IsString()
  sessionType?: string;
}
