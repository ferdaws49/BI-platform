import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Param, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { MlService } from './ml.service';
import { PredictCADto } from './dtos/predict-ca.dto';
import { PredictFilterDto } from './dtos/predict-filter.dto';

@Controller('ml')
export class MlController {
    private readonly ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

    private readonly logger = new Logger(MlController.name);
  constructor(private readonly mlService: MlService) {}

   @Get('ca/historique')
  async getCAHistorique(@Query() filters: PredictCADto) {
    return this.mlService.getCAHistorique(filters);
  }

  @Post('ca/predict/:periode')
  async predictCA(
    @Body() filters: PredictCADto,
    @Param('periode') periode: number,
  ) {
    // periode = 1, 3 ou 6
    return this.mlService.predictCA(filters, Number(periode));
  }

  




  /**
   * POST /ml-prediction/predict
   * Frontend sends filters → NestJS extracts DW data → FastAPI predicts → returns results
   */
  @Post('predict')
  async predictSessions(@Body() filters: PredictFilterDto) {
    return this.mlService.predictDeficit(filters);
  }

  /**
   * GET /ml-prediction/health
   * Simple health check
   */
  @Get('health')
  health(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

}

