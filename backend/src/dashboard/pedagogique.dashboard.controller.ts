import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PedagogiqueDashboardService } from './services/pedagogique.dashboard.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';

@Controller('responsable/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('resp_pedagogique')
export class PedagogiqueDashboardController {
  constructor(private readonly pedagogiqueService: PedagogiqueDashboardService) {}

  @Get('overview')
  getOverview(@Query() filters: DashboardFilterDto) {
    // Assuming Responsable needs a general overview from the kpis. 
    // You can also create a dedicated overview service method in the future.
    return this.pedagogiqueService.getKpis(filters);
  }

  @Get('kpis')
  getKpis(@Query() filters: DashboardFilterDto) {
    return this.pedagogiqueService.getKpis(filters);
  }

  @Get('formateurs/performances')
  getFormateursPerformances(@Query() filters: DashboardFilterDto) {
    return this.pedagogiqueService.getFormateursPerformances(filters);
  }

  @Get('formations/taux-reussite')
  getFormationsTauxReussite(@Query() filters: DashboardFilterDto) {
    return this.pedagogiqueService.getFormationsTauxReussite(filters);
  }

  @Get('apprenants/risque')
  getApprenantsARisque(@Query() filters: DashboardFilterDto) {
    return this.pedagogiqueService.getApprenantsARisque(filters);
  }

  @Get('filters/options')
  getFiltersOptions() {
    return this.pedagogiqueService.getFiltersOptions();
  }
}
