 import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CostFilterDto } from '../dto/cost-filter.dto';
import { FinanceCostService } from '../services/finance-cost.service';
import {
  CostKpiDto,
  CostRepartitionResponseDto,
  CostTrendResponseDto,
  SessionCostTableResponseDto,
  SessionEfficienceDto,
  TopFormateurCostDto,
} from '../dto/cost-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/roles.decorator';



@ApiTags('Finance — Coûts & rentabilité')
@Controller('finance/cout')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('resp_financier')

export class FinanceCostController {
  constructor(private readonly financeCostService: FinanceCostService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'KPI : coûts totaux, formateurs, moyenne / session, break-even' })
  @ApiOkResponse({ type: CostKpiDto })
  getKpi(@Query() filter: CostFilterDto ): Promise<CostKpiDto> {
    return this.financeCostService.getKpi(filter);
  }

  @Get('top-formateurs')
  @ApiOperation({ summary: 'Formateurs les plus coûteux (agrégation par nom / id stable)' })
  @ApiOkResponse({ type: [TopFormateurCostDto] })
  getTopFormateurs(@Query() filter: CostFilterDto): Promise<TopFormateurCostDto[]> {
    return this.financeCostService.getTopFormateurs(filter);
  }
  @Get('repartition')
  @ApiOperation({ summary: 'Répartition des coûts (formateurs vs logistique, %)' })
  @ApiOkResponse({ type: CostRepartitionResponseDto })
  getRepartition(@Query() filter: CostFilterDto): Promise<CostRepartitionResponseDto> {
    return this.financeCostService.getRepartition(filter);
  }

   @Get('sessions')
  @ApiOperation({
    summary: 'Table détaillée par session : coûts, marge, remplissage, rentabilité, pagination & tri',
  })
  @ApiOkResponse({ type: SessionCostTableResponseDto })
  getSessions(@Query() filter: CostFilterDto): Promise<SessionCostTableResponseDto> {
    return this.financeCostService.getSessionsTable(filter);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Évolution mensuelle du coût total (bucket = mois de début de session)' })
  @ApiOkResponse({ type: CostTrendResponseDto })
  getTrend(@Query() filter: CostFilterDto): Promise<CostTrendResponseDto> {
    return this.financeCostService.getTrend(filter);
  }

  @Get('efficience')
  @ApiOperation({
    summary: 'Données combo chart : coût total par session vs coût par étudiant',
  })
  @ApiOkResponse({ type: [SessionEfficienceDto] })
  getEfficience(@Query() filter: CostFilterDto): Promise<SessionEfficienceDto[]> {
    return this.financeCostService.getEfficience(filter);
  }
}

