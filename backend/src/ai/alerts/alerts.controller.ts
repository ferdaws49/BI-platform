// src/ai/alerts/alerts.controller.ts

import { Controller, Get, UseGuards } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('responsable/alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('resp_pedagogique')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  /**
   * GET /responsable/alerts
   * Retourne les apprenants triés par risk score (ML model Python)
   */
  @Get()
  async getAlerts() {
    return this.alertsService.getAlerts();
  }
}
