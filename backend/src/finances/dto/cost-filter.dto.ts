import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { SortOrder } from './revenue-filter.dto';

/** Préréglage période si startDate / endDate absents */
export enum CostPeriodPreset {
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum RentabilityFilter{
  RENTABLE = 'rentable',
  SEUIL = 'seuil',
  DEFICITAIRE = 'deficitaire',
}

export enum TauxRemplissageFilter {
  LOW = 'low',
  MID = 'mid',
  HIGH = 'high',
}

export enum CostLevelFilter {
  PETIT = 'petit',
  MOYEN = 'moyen',
  ELEVE = 'eleve',
}

export enum CostSessionSortBy {
  COUT = 'cout',
  MARGE = 'marge',
  RENTABILITE = 'rentabilite',
  TAUX_REMPLISSAGE = 'tauxRemplissage',
  DATE = 'date',
}
function toOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export class CostFilterDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: CostPeriodPreset, description: 'Utilisé si start/end absents' })
  @IsOptional()
  @IsEnum(CostPeriodPreset)
  periodPreset?: CostPeriodPreset;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  formationId?: number;

  @ApiPropertyOptional({
    description: 'Identifiant stable du formateur (hash du nom), voir top-formateurs',
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  formateurId?: number;

  @ApiPropertyOptional({ enum: RentabilityFilter })
  @IsOptional()
  @IsEnum(RentabilityFilter)
  rentabilite?: RentabilityFilter;

  @ApiPropertyOptional({ enum: TauxRemplissageFilter })
  @IsOptional()
  @IsEnum(TauxRemplissageFilter)
  tauxRemplissage?: TauxRemplissageFilter;

  @ApiPropertyOptional({ enum: CostLevelFilter })
  @IsOptional()
  @IsEnum(CostLevelFilter)
  niveauCout?: CostLevelFilter;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ enum: CostSessionSortBy, default: CostSessionSortBy.COUT })
  @IsOptional()
  @IsEnum(CostSessionSortBy)
  sortBy?: CostSessionSortBy = CostSessionSortBy.COUT;

  @ApiPropertyOptional({ example: 10, description: 'Limite pour top-formateurs' })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(50)
  topLimit?: number = 10;
}
