import { IsOptional, IsDateString, IsArray, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PredictRequestDto {
  @IsOptional()
  @IsDateString()
  startDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  formationIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  formateurIds?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sessionTypes?: string[];
}



export class PredictCADto {
  categorie?: string;
  formationId?: number;
  typeSession?: string;
  periode?: number;
}