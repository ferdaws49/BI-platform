// import/import.service.ts

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ImportJob } from './entities/import-job.entity';
import {
  getEntitySchema,
  getGeneratedSchemas,
} from './utils/entity-schemas.js';
import { ENTITY_METADATA_CONFIG } from './utils/entity-metadata.js';
import {
  EntitiesResponseDto,
  EntityConfigDto,
  ProcessImportDto,
  ImportResultDto,
} from './dto/import.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @InjectRepository(ImportJob)
    private readonly importJobRepo: Repository<ImportJob>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ─── GET /import/entities ────────────────────────────────────────────────────
  async getEntities(): Promise<EntitiesResponseDto> {
    const schemas = await getGeneratedSchemas(this.dataSource);

    // ✅ Raw SQL pur — contourne complètement le bug TypeORM QB avec getRawMany()
    const stats: Array<{
      type: string;
      totalImports: string;
      lastImport: Date | null;
      lastStatus: string | null;
    }> = await this.dataSource.query(`
      SELECT
        job.type                AS "type",
        COUNT(job.id)           AS "totalImports",
        MAX(job.created_at)     AS "lastImport",
        (
          SELECT j2.status
          FROM import_job j2
          WHERE j2.type = job.type
          ORDER BY j2.created_at DESC
          LIMIT 1
        )                       AS "lastStatus"
      FROM import_job job
      GROUP BY job.type
    `);

    const statsMap = new Map(stats.map((s) => [s.type, s]));

    const entities: EntityConfigDto[] = schemas.map((schema) => {
      const dbStats = statsMap.get(schema.key);
      return {
        ...schema,
        totalImports: dbStats ? Number(dbStats.totalImports) : 0,
        lastImport: dbStats?.lastImport ?? null,
        lastStatus: dbStats?.lastStatus ?? null,
      };
    });

    return { entities };
  }

  // ─── POST /import ─────────────────────────────────────────────────────────────
  async processImport(dto: ProcessImportDto): Promise<ImportResultDto> {
    const schema = await getEntitySchema(dto.type, this.dataSource);
    if (!schema) {
      throw new BadRequestException(`Type d'entité inconnu : "${dto.type}"`);
    }

    if (!Array.isArray(dto.data) || dto.data.length === 0) {
      throw new BadRequestException('Aucune donnée valide à importer.');
    }

    // ── Étape 1 : Créer le job en DB ─────────────────────────────────────────
    const job = this.importJobRepo.create({
      type: dto.type,
      status: 'pending',
      file_path: dto.filePath ?? '',
      total_rows: dto.data.length,
      duplicate_strategy: dto.duplicateStrategy,
      relation_strategy: dto.relationStrategy,
    });
    await this.importJobRepo.save(job);
    this.logger.log(
      `ImportJob #${job.id} créé — type: ${dto.type}, rows: ${dto.data.length}`,
    );

    // ── Étape 2 : Passer en "processing" ─────────────────────────────────────
    await this.importJobRepo.update(job.id, { status: 'processing' });

    let imported_rows = 0;
    let error_count = 0;

    try {
      // ── Étape 3 : Persistance générique via QueryRunner ────────────────────
      const result = await this.bulkUpsert(
        dto.type,
        dto.data,
        dto.duplicateStrategy,
      );
      imported_rows = result.imported;
      error_count = result.errors;

      // ── Étape 4 : Marquer "done" ────────────────────────────────────────────
      await this.importJobRepo.update(job.id, {
        status: 'done',
        imported_rows,
        error_count,
      });
      this.logger.log(
        `ImportJob #${job.id} terminé — ${imported_rows} lignes importées, ${error_count} erreurs`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      await this.importJobRepo.update(job.id, {
        status: 'failed',
        error_count: dto.data.length,
      });
      this.logger.error(
        `ImportJob #${job.id} échoué — ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(`Échec de l'importation : ${message}`);
    }

    return {
      jobId: job.id,
      entity: schema.label,
      status: 'done',
      totalRows: dto.data.length,
      importedRows: imported_rows,
      errorCount: error_count,
    };
  }

  // ─── Bulk upsert générique ────────────────────────────────────────────────
  private async bulkUpsert(
    entityType: string,
    rows: Record<string, any>[],
    strategy: 'ignore' | 'update' | 'error',
  ): Promise<{ imported: number; errors: number }> {
    const entityMetadata = this.dataSource.entityMetadatas.find(
      (meta) =>
        meta.name.toLowerCase() === entityType.replace(/s$/, '').toLowerCase() ||
        meta.tableName === entityType,
    );

    if (!entityMetadata) {
      throw new BadRequestException(
        `Metadata introuvable pour l'entité "${entityType}"`,
      );
    }

    const entityConfig = ENTITY_METADATA_CONFIG[entityType];
    const uniqueKey = entityConfig?.uniqueKey || 'id';

    const validDatabaseColumns = new Set(
      entityMetadata.columns.map((c) => c.propertyName),
    );

    const tableName = entityMetadata.tableName;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let imported = 0;
    let errors = 0;

    try {
      for (const row of rows) {
        const savepointName = `sp_${imported + errors}`;

        try {
          await queryRunner.query(`SAVEPOINT ${savepointName}`);

          const columns = Object.keys(row).filter(
            (key) => validDatabaseColumns.has(key) && !key.startsWith('_'),
          );

          const values = await Promise.all(
            columns.map(async (col) => {
              const val = row[col];
              if (col === 'password' && val) {
                return await bcrypt.hash(String(val), 10);
              }
              return val;
            }),
          );

          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const columnList = columns.map((c) => `"${c}"`).join(', ');

          let query = `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`;
          if (strategy === 'ignore') {
            query += ` ON CONFLICT ("${uniqueKey}") DO NOTHING`;
          } else if (strategy === 'update') {
            const updateSet = columns
              .map((c) => `"${c}" = EXCLUDED."${c}"`)
              .join(', ');
            query += ` ON CONFLICT ("${uniqueKey}") DO UPDATE SET ${updateSet}`;
          }

          await queryRunner.query(query, values);
          await queryRunner.query(`RELEASE SAVEPOINT ${savepointName}`);
          imported++;
        } catch (rowError: unknown) {
          await queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
          const msg =
            rowError instanceof Error ? rowError.message : 'Erreur ligne';
          this.logger.warn(`Ligne ignorée — ${msg}`);
          errors++;

          if (strategy === 'error') {
            throw rowError;
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return { imported, errors };
  }
}