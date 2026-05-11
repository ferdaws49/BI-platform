// import/dto/import.dto.ts
// import/dto/import.dto.ts

import {
  IsString,
  IsArray,
  IsIn,
  IsOptional,
  IsNotEmpty,
  ArrayMinSize,
  IsObject,
} from 'class-validator';
import { StaticEntitySchema } from '../utils/entity-schemas';

// ─── Réponse GET /import/entities ────────────────────────────────────────────

/** Stats live depuis la table import_job pour une entité donnée */
export class EntityStatsDto {
  totalImports: number;
  lastImport: Date | null;
  lastStatus: string | null;
}

/** Schema statique enrichi avec stats DB */
export class EntityConfigDto implements StaticEntitySchema {
  key: string;
  label: string;
  description: string;
  icon: string;
  fields: StaticEntitySchema['fields'];

  // enrichi depuis ImportJob
  totalImports: number;
  lastImport: Date | null;
  lastStatus: string | null;
}

export class EntitiesResponseDto {
  entities: EntityConfigDto[];
}

// ─── Body POST /import ────────────────────────────────────────────────────────

export class ProcessImportDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsObject({ each: true })
  data: Record<string, any>[];

  @IsIn(['ignore', 'update', 'error'])
  duplicateStrategy: 'ignore' | 'update' | 'error';

  @IsIn(['create', 'ignore', 'error'])
  relationStrategy: 'create' | 'ignore' | 'error';

  @IsOptional()
  @IsString()
  filePath?: string; // nom du fichier original, envoyé par le frontend
}

// ─── Réponse POST /import ─────────────────────────────────────────────────────

export class ImportResultDto {
  jobId: number;
  entity: string;
  status: string;
  totalRows: number;
  importedRows: number;
  errorCount: number;
}