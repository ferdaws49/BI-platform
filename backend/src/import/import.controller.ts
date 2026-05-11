// import/import.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ImportService } from './import.service';
import {
  ProcessImportDto,
  EntitiesResponseDto,
  ImportResultDto,
} from './dto/import.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * GET /import/entities
   * Retourne les schemas de toutes les entités importables
   * enrichis avec les stats live depuis la table import_job.
   *
   * Appelé par le frontend au mount de StepConfig.
   * Ajouter une entité = modifier uniquement entity-schemas.ts.
   */
  @Get('entities')
  async getEntities(): Promise<EntitiesResponseDto> {
    return this.importService.getEntities();
  }

  /**
   * POST /import
   * Reçoit les données validées/mappées du frontend,
   * crée un ImportJob en DB et persiste les données.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async processImport(@Body() dto: ProcessImportDto): Promise<ImportResultDto> {
    return this.importService.processImport(dto);
  }
}