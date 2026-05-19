import { Body, Controller, Get, Post } from '@nestjs/common';
import { MlService } from './ml.service';

@Controller('ml')
export class MlController {
  constructor(private readonly mlService: MlService) {}

  @Get('health')
  healthCheck() {
    return this.mlService.healthCheck();
  }

  @Get('predict-ca')
  predictCA() {
    return this.mlService.predictCA();
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

