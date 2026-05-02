import { Controller, Post, Body, Res, UseGuards, Request } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ExportService } from './export.service';
import { ExportDto } from './dto/export-filter.dto';

@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('directeur')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  exportReport(
    @Body() dto: ExportDto,
    @Res() res: ExpressResponse,
  ) {
    return this.exportService.export(dto, res);
  }
}