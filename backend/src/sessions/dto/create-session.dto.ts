import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsArray,
  Matches,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';
import { SessionStatut, SessionType } from '../entities/session.entity';

// DTO utilise pour valider le body de creation d'une session.
export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date doit être au format YYYY-MM-DD',
  })
  date: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: 'heureDebut doit être au format HH:mm' })
  heureDebut: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: 'heureFin doit être au format HH:mm' })
  heureFin: string;

  @IsInt()
  @IsNotEmpty()
  formationId: number;

  @IsInt()
  @IsOptional()
  formateurId?: number;

  @IsString()
  @IsOptional()
  lieu?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  capacite?: number;

  @IsEnum(SessionStatut)
  @IsOptional()
  statut?: SessionStatut;
  
  // ✅ type session
  @IsEnum(SessionType)
  @IsOptional()
  type?: SessionType;

  // Si absent ou null, le service utilisera le prix de la formation.
  @IsNumber()
  @Min(0)
  @IsOptional()
  prix?: number | null;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  apprenantIds?: number[];
}
