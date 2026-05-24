import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { MlService } from './ml.service';
import { PredictCADto } from './dtos/predict-ca.dto';
import { PredictFilterDto } from './dtos/predict-filter.dto';
import { PredictResponseDto } from './dtos/predict-response.dto';

@Controller('ml')
export class MlController {
    private readonly logger = new Logger(MlController.name);
  constructor(private readonly mlService: MlService) {}

  @Get('health')
  healthCheck() {
    return this.mlService.healthCheck();
  }

  @Post('predict-ca')
predictCA(@Body() filters: PredictCADto) {
  return this.mlService.predictCA(filters);
}

  @Get('predict-ca/backtest')
  backtestCA() {
    return this.mlService.backtestCA();
  }





  /**
   * POST /ml-prediction/predict
   * Frontend sends filters → NestJS extracts DW data → FastAPI predicts → returns results
   */
  @Post('predict')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async predict(@Body() filters: PredictFilterDto): Promise<PredictResponseDto> {
    this.logger.log(`Predict request received with filters: ${JSON.stringify(filters)}`);
    return this.mlService.predict(filters);
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

