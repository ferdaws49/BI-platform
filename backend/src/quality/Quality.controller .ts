import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QualityService } from './Quality.service';
import { QualityFilterDto } from './dto/Quality.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('directeur/quality')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('directeur')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  /**
   * GET /directeur/quality/overview
   * KPIs: avgSatisfaction, avgReussite, avgAbandon, scoreQualite, evolutionReussite
   * → Used by QualitySection KPI cards + Line chart
   */
  @Get('overview')
  getOverview(@Query() filters: QualityFilterDto) {
    return this.qualityService.getOverview(filters);
  }

  /**
   * GET /directeur/quality/formations
   * Table: formation, formateur, satisfaction, reussite, abandon
   * → Used by QualitySection detailed table + Bar chart satisfaction
   */
  @Get('formations')
  getFormations(@Query() filters: QualityFilterDto) {
    return this.qualityService.getQualityByFormation(filters);
  }

  /**
   * GET /directeur/quality/formateurs-performance
   * Bar chart: formateur → avg score
   * → Used by QualitySection "Performance des formateurs" chart
   */
  @Get('formateurs-performance')
getFormateursPerformance(@Query() filters: QualityFilterDto) {
  return this.qualityService.getFormateursPerformance(filters);
}
}