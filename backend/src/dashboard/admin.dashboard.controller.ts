import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminDashboardService } from './services/admin.dashboard.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('kpis')
  getKpis() {
    return this.adminDashboardService.getKpis();
  }

  @Get('activity')
  getActivity() {
    return this.adminDashboardService.getActivity();
  }

  @Get('alerts')
  getAlerts() {
    return this.adminDashboardService.getAlerts();
  }

  @Get('data-quality')
  getDataQuality() {
    return this.adminDashboardService.getDataQuality();
  }
}