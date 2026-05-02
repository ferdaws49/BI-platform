import {
  IsString,
  IsNotEmpty,
  Matches,
  IsInt,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer'; // ✅ زيد هذا

export class ConflictCheckDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date doit être au format YYYY-MM-DD',
  })
  date: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'heureDebut doit être au format HH:mm',
  })
  heureDebut: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'heureFin doit être au format HH:mm',
  })
  heureFin: string;

  @Type(() => Number) // ✅ زيد هذا
  @IsInt()
  @IsOptional()
  formateurId?: number;

  @Type(() => Number) // ✅ زيد هذا
  @IsInt()
  @IsOptional()
  formationId?: number;

  // Permet d'exclure une session (utile pour la modification).

  @IsUUID()
  @IsOptional()
  excludeId?: string;
}
