import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateFormationDto {
  @IsString()
  @IsNotEmpty()
  titre: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  categorie?: string;

  @IsNumber()
  prix: number;

  @IsNumber()
  @IsOptional()
  dureeHeures?: number;

  @IsString()
  @IsOptional()
  statut?: 'active' | 'completed';
}