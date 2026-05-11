import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { FormationStatus } from '../entities/formation.entity';

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

  @IsEnum(FormationStatus)
  @IsString()
  @IsOptional()
  statut?: FormationStatus;
}