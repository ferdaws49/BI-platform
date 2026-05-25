import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertFilterDto } from './dtos/alert-filter.dto';
import { AlertResponseDto } from './dtos/alert-response.dto';
import { AlertStatus } from './entities/alert-status.entity';

@Controller('directeur/alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  getAlerts(@Query() filter: AlertFilterDto) {
    return this.alertsService.getAlerts(filter);
  }

  @Post(':id/view')
  markViewed(@Param('id') alertId: string) {
    // TODO: extraire userId depuis JWT → @Request() req → req.user.id
    return this.alertsService.markViewed(alertId);
  }

  @Post(':id/treat')
  markTreated(@Param('id') alertId: string) {
    return this.alertsService.markTreated(alertId);
  }
}
