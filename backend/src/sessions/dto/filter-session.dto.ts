import { IsOptional, IsIn, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';

// DTO pour les filtres disponibles sur la liste des sessions.
export class FilterSessionDto {
  @IsOptional()
  @IsIn(['week', 'month', 'year'])
  periode?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  formation?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  formateur?: number;

  @IsOptional()
  @IsString()
  @IsIn(['Actif', 'Terminé', 'Annulé'])
  statut?: string;
}
