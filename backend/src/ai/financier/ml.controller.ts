// backend/src/ml/ml.controller.ts
import { Body, Controller, Get, Logger, Param, Post, Query } from '@nestjs/common';
import { MlService } from './ml.service';
import { PredictCADto } from './dtos/predict-ca.dto';
import { PredictFilterDto } from './dtos/predict-filter.dto';

@Controller('ml')
export class MlController {
  private readonly logger = new Logger(MlController.name);

  constructor(private readonly mlService: MlService) {}

  @Get('ca/historique')
  async getCAHistorique(@Query() filters: PredictCADto) {
    this.logger.log(`GET /ml/ca/historique — filters: ${JSON.stringify(filters)}`);
    return this.mlService.getCAHistorique(filters);
  }

  @Post('ca/predict/:periode')
  async predictCA(
    @Body() filters: PredictCADto,
    @Param('periode') periode: string,
  ) {
    this.logger.log(`POST /ml/ca/predict/${periode}`);
    return this.mlService.predictCA(filters, Number(periode));
  }

  @Post('predict')
  async predictSessions(@Body() filters: PredictFilterDto) {
    this.logger.log(`POST /ml/predict — filters: ${JSON.stringify(filters)}`);
    return this.mlService.predictDeficit(filters);
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}