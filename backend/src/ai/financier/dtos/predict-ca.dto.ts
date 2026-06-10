// src/ml-prediction/dtos/predict-ca.dto.ts
import { IsOptional, IsString, IsInt, IsDateString, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger'; // si tu utilises Swagger

export class PredictCADto {
  @ApiPropertyOptional({ example: '2024-01-01', description: 'Date début (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}(T.*)?$/, { message: 'dateFrom must be YYYY-MM-DD' })
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Date fin (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}(T.*)?$/, { message: 'dateTo must be YYYY-MM-DD' })
  dateTo?: string;

  @ApiPropertyOptional({ example: 5, description: 'ID formation' })
  @IsOptional()
  @Type(() => Number)  // transforme "5" (query param) → 5 (number)
  @IsInt()
  formationId?: number;

  @ApiPropertyOptional({ example: 12, description: 'ID formateur' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  formateurId?: number;

  @ApiPropertyOptional({ example: 'présentiel', description: 'Type de session' })
  @IsOptional()
  @IsString()
  sessionType?: string;

  @ApiPropertyOptional({ example: 3, description: 'Période de prédiction en mois (1, 3, 6, 12)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periode?: number;  // utilisé seulement pour /predict, pas pour /historique
}