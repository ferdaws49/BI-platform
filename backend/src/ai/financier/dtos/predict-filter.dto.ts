import { IsOptional, IsInt, IsString, Min, Max, IsDateString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class PredictFilterDto {
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}(T.*)?$/)
  dateFrom?: string;   // Format: "2026-01-01"

  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}(T.*)?$/)
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
