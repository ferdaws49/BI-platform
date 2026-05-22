import { Body, Controller, Get, Post } from '@nestjs/common';
import { MlService } from './ml.service';
import { PredictCADto } from './dtos/predict-ca.dto';

@Controller('ml')
export class MlController {
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

  @Post('predict-sessions-deficit')
  predictSessionsDeficit(@Body() body: any) {
    return this.mlService.predictSessionsDeficit(body.sessions);
  }

}

