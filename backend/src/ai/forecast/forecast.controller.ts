// src/ai/forecast/forecast.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('directeur/forecast')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('directeur')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  /**
   * GET /directeur/forecast/inscriptions?periodes=3
   * Prévision des inscriptions pour les N prochains mois (Prophet)
   */
  @Get('inscriptions')
  async getForecastInscriptions(@Query('periodes') periodes?: string) {
    const n = periodes ? Math.min(12, Math.max(1, parseInt(periodes))) : 3;
    return this.forecastService.getForecast(n);
  }
}
