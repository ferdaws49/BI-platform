import { Controller, Get, Query } from '@nestjs/common';
import { AiPredictionService } from './ai-prediction.service';
import { AiFilterDto } from '././dtos/ai-filter.dto';
import {
  RevenueForecastDto,
  SessionRiskDto,
  CashflowForecastDto,
  SeasonalityDto,
  AiDashboardDto,
} from '././dtos/ai-response.dto';;

@Controller('ai/predictions')
export class AiPredictionController {
  constructor(private readonly aiService: AiPredictionService) {}

  @Get('revenue')
  async revenue(@Query() filter: AiFilterDto): Promise<RevenueForecastDto> {
    return this.aiService.predictRevenue(filter);
  }

  @Get('sessions/risk')
  async sessionRisk(@Query() filter: AiFilterDto): Promise<SessionRiskDto[]> {
    return this.aiService.predictSessionRisk(filter);
  }

  @Get('cashflow')
  async cashflow(@Query() filter: AiFilterDto): Promise<CashflowForecastDto> {
    return this.aiService.predictCashflow(filter);
  }

  @Get('seasonality')
  async seasonality(@Query() filter: AiFilterDto): Promise<SeasonalityDto> {
    return this.aiService.predictSeasonality(filter);
  }

  @Get('dashboard')
  async dashboard(@Query() filter: AiFilterDto): Promise<AiDashboardDto> {
    return this.aiService.getDashboard(filter);
  }
}