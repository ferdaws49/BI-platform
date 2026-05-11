// dashboard/dto/report-filters.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class ReportFiltersDto {
  @IsOptional()
  @IsString()
  periode?: string; // 'Trimestre' | 'Semestre' | 'Année'

  @IsOptional()
  @IsString()
  formation?: string; // titre ou 'Tous'

  @IsOptional()
  @IsString()
  formateur?: string; // nom ou 'Tous'

  @IsOptional()
  @IsString()
  type?: string; // 'Présentiel' | 'En ligne' | 'Tous'

  @IsOptional()
  @IsString()
  statut?: string; // 'Actif' | 'Terminé' | 'Annulé' | 'Tous'
}