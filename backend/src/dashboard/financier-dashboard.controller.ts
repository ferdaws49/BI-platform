import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { FinancierDashboardService } from './services/financier.dashboard.service';

import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FinancierDashboardFilterDto } from './dto/financier-dashboard-filter.dto';
import {
  CategoryRevenueCostItemDto,
  DashboardKpisDto,
  FormationRevenueItemDto,
  MonthlyRevenueItemDto,
  SessionsPerformanceResponseDto,
} from 'src/dashboard/dto/financier-dashboard-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/roles.decorator';


@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('financier/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("resp_financier")
export class FinancierDashboardController {
  constructor(private readonly financierdashboardService: FinancierDashboardService) {}

@Get('formations')
getFormations() {
  return this.financierdashboardService.getAllFormations();
}

@Get('formateurs')
getFormateurs() {
  return this.financierdashboardService.getAllFormateurs();
}


  @Get('kpis')
  @ApiOperation({ summary: 'KPIs globaux (legacy) : CA, facture, marge, croissance' })
  @ApiOkResponse({ type: DashboardKpisDto })
  getKpisGlobaux(@Query() filter: FinancierDashboardFilterDto): Promise<DashboardKpisDto> {
    return this.financierdashboardService.getKpisGlobaux(filter);
  }


  @Get('charts/revenue-by-month')
  @ApiOperation({ summary: 'CA réalisé agrégé par mois (une seule série)' })
  @ApiOkResponse({ type: [MonthlyRevenueItemDto] })
  getRevenueByMonth(
    @Query() filter: FinancierDashboardFilterDto,
  ): Promise<MonthlyRevenueItemDto[]> {
    return this.financierdashboardService.getRevenueByMonth(filter);
  }
 

  

  @Get('charts/revenue-cost-by-category')
  @ApiOperation({ summary: 'Revenu et coût par catégorie (bar groupé)' })
  @ApiOkResponse({ type: [CategoryRevenueCostItemDto] })
  getRevenuCoutByCategory(
    @Query() filter: FinancierDashboardFilterDto,
  ): Promise<CategoryRevenueCostItemDto[]> {
    return this.financierdashboardService.getRevenuCoutByCategory(filter);
  }

  @Get('charts/ca-by-formation')
  @ApiOperation({ summary: 'Top 6 formations par CA réalisé' })
  @ApiOkResponse({ type: [FormationRevenueItemDto] })
  getCaByFormation(
    @Query() filter: FinancierDashboardFilterDto,
  ): Promise<FormationRevenueItemDto[]> {
    return this.financierdashboardService.getCaByFormation(filter);
  }

  @Get('sessions-performance')
  @ApiOperation({
    summary: 'Tableau performance (ROI, coûts) — pagination, tri, badge statut',
  })
  @ApiOkResponse({ type: SessionsPerformanceResponseDto })
  getSessionsPerformance(
    @Query() filter: FinancierDashboardFilterDto,
  ): Promise<SessionsPerformanceResponseDto> {
    return this.financierdashboardService.getSessionsPerformance(filter);
  }
}
