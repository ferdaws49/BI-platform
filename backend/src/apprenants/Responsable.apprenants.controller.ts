import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ResponsableApprenantsService } from './Responsable.apprenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { QualityFilterDto } from '../quality/dto/Quality.dto';


@Controller('responsable/apprenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('resp_pedagogique')
export class ResponsableApprenantsController {
  constructor(
    private readonly apprenantsService: ResponsableApprenantsService,
  ) {}

  // GET /responsable/apprenants
  // Query params : ?formation=X&formateur=Y&periode=Z&statut=W
  //
  // Retourne : { students, studentStatus, scoreEvolution, formationSuccess }
  // Le frontend (page.tsx + ChartsSection.tsx) consomme cette structure.
  @Get()
  getApprenants(@Query() filters: QualityFilterDto) {
    return this.apprenantsService.getApprenantsData(filters);
  }

  // GET /responsable/apprenants/risque
  // Apprenants à risque : score < 50 OU taux de complétion < 40%
  @Get('risque')
  getApprenantsARisque(@Query() filters: QualityFilterDto) {
    return this.apprenantsService.getApprenantsARisque(filters);
  }
}