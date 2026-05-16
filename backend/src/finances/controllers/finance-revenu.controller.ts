import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger";
import { BubbleChartPointDto, CategoryRevenueShareDto, KpiCardsDto, RevenueEvolutionMultiLineDto, SessionRevenueTableResponseDto } from "../dto/revenue-response.dto";
import { FormationRevenueItemDto } from "src/dashboard/dto/financier-dashboard-response.dto";
import { AuthGuard } from "src/auth/guards/auth.guard";
import { FinanceRevenueService } from "../services/finance-revenu.service";
import { RevenueFilterDto } from "../dto/revenue-filter.dto";
import type { Response } from 'express';
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";

console.log(FinanceRevenueService);
@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('revenue')
@UseGuards(JwtAuthGuard)
export class FinanceRevenueController {

  constructor(private readonly financeRevenueService: FinanceRevenueService) {}


  @Get('kpi-cards')
  @ApiOperation({
    summary:
      'Cartes KPI : CA réalisé (+ croissance), taux de recouvrement, top formation, panier moyen (+ croissance)',
  })
  @ApiOkResponse({ type: KpiCardsDto })
  getKpiCards(@Query() filter: RevenueFilterDto): Promise<KpiCardsDto> {
    return this.financeRevenueService.getKpiCards(filter);
  }

  
  @Get('charts/revenue-evolution-by-formation')
  @ApiOperation({
    summary: 'Line chart : CA par mois, une série par formation (top N, défaut 5)',
  })
  @ApiOkResponse({ type: RevenueEvolutionMultiLineDto })
  getRevenueEvolutionByFormation(
    @Query() filter: RevenueFilterDto,
  ): Promise<RevenueEvolutionMultiLineDto> {
    return this.financeRevenueService.getRevenueEvolutionByFormation(filter);
  }


  


  @Get('charts/top-formations-bar')
  @ApiOperation({ summary: 'Bar chart : top 5 formations par CA réalisé' })
  @ApiOkResponse({ type: [FormationRevenueItemDto] })
  getTopFormationsBar(
    @Query() filter: RevenueFilterDto,
  ): Promise<FormationRevenueItemDto[]> {
    return this.financeRevenueService.getTopFormationsBar(filter);
  }

   @Get('charts/revenue-by-category-pie')
  @ApiOperation({ summary: 'Pie chart : répartition du CA par catégorie de formation' })
  @ApiOkResponse({ type: [CategoryRevenueShareDto] })
  getRevenueByCategoryPie(
    @Query() filter: RevenueFilterDto,
  ): Promise<CategoryRevenueShareDto[]> {
    return this.financeRevenueService.getCategoryPie(filter);
  }


   @Get('charts/bubble')
  @ApiOperation({
    summary:
      'Bubble chart : X = inscriptions, Y = CA ; taille = marge (revenu - coûts) ou prix moyen (query bubbleMetric)',
  })
  @ApiOkResponse({ type: [BubbleChartPointDto] })
  getBubble(@Query() filter: RevenueFilterDto): Promise<BubbleChartPointDto[]> {
    return this.financeRevenueService.getBubbleChart(filter);
  }


  @Get('table/sessions-revenue')
  @ApiOperation({
    summary:
      'Tableau sessions : prix, CA période, variation vs période précédente (couleur), pagination & tri',
  })
  @ApiOkResponse({ type: SessionRevenueTableResponseDto })
  getSessionsRevenueTable(
    @Query() filter: RevenueFilterDto,
  ): Promise<SessionRevenueTableResponseDto> {
    return this.financeRevenueService.getSessionsRevenueTable(filter);
  }


  @Get('table/sessions-revenue/export')
  @ApiOperation({ summary: 'Export CSV (ouvrable dans Excel)' })
  @ApiProduces('text/csv')
  async exportSessionsRevenue(
    @Query() filter: RevenueFilterDto,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.financeRevenueService.exportSessionsRevenueCsv(filter);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="sessions-revenue.csv"',
    );
    res.send(csv);
  }

  

 
} 