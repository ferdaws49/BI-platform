import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class AiFilterDto {
  @IsOptional()
  @IsString()
  startDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  endDate?: string;   // YYYY-MM-DD

  @IsOptional()
  @IsNumberString()
  formationId?: string;

  @IsOptional()
  @IsNumberString()
  predictMonths?: string; // nombre de mois à prédire (défaut: 3)
}