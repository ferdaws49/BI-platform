import { Controller, Get, Query } from '@nestjs/common';
import { FinanceAlertService, AlertInputData } from './finance-alert.service';
import { FinanceCostService } from 'src/finances/services/finance-cost.service';
import { FinanceRevenueService } from 'src/finances/services/finance-revenu.service';
import { AlertFilterDto } from '../dtos/alert-filter.dto';
import { AlertResponseDto } from '../dtos/finance-alert.dto';

@Controller('finance/alerts')
export class FinanceAlertController {
  constructor(
    private readonly alertService: FinanceAlertService,
    private readonly costService: FinanceCostService,
    private readonly revenueService: FinanceRevenueService,
  ) {}

  @Get()
  async getAlerts(@Query() filter: AlertFilterDto): Promise<AlertResponseDto> {
    const costFilter = {
      startDate: filter.startDate,
      endDate: filter.endDate,
      formationId: filter.formationId ? Number(filter.formationId) : undefined,
    };

    const revenueFilter = {
      startDate: filter.startDate,
      endDate: filter.endDate,
      formationId: filter.formationId ? Number(filter.formationId) : undefined,
    };

    const [costKpis, sessionCosts, revenueKpis, paymentKpis, paymentPie] = await Promise.all([
      this.costService.getKpi(costFilter as any).catch(() => undefined),
      this.costService.getSessionsTable(costFilter as any).catch(() => undefined),
      this.revenueService.getKpiCards(revenueFilter as any).catch(() => undefined),
      this.revenueService.getPaymentManagementKpis(revenueFilter as any).catch(() => undefined),
      this.revenueService.getPaymentManagementPie(revenueFilter as any).catch(() => undefined),
    ]);

    const data: AlertInputData = {
      costKpis,
      sessionCosts,
      revenueKpis,
      paymentKpis,
      paymentPie,
    };

    return this.alertService.generateAlerts(data);
  }
}