import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CAForecastResponseDto } from './dtos/ca-forecast.dto';

@Injectable()
export class MlService {
  private readonly ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  private readonly logger = new Logger(MlService.name);

  constructor(private readonly httpService: HttpService) {}

  // ── CA Forecast ───────────────────────────────────────────
  async predictCA(): Promise<CAForecastResponseDto> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.ML_URL}/predict-ca`)
      );
      this.logger.log(`CA prédit pour ${data.previsions.length} mois`);
      return data;
    } catch (error: unknown) {
         let message = 'Unknown error';
         if (error instanceof Error) {
            message = error.message;
        }
      this.logger.error('Erreur ML predict-ca', message);
      throw new HttpException(
        'Service ML indisponible',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ── Backtest ──────────────────────────────────────────────
  async backtestCA(): Promise<any> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.ML_URL}/predict-ca/backtest`)
      );
      return data;
    } catch (error) {
      throw new HttpException(
        'Erreur backtest ML',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ── Health ────────────────────────────────────────────────
  async healthCheck(): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.ML_URL}/health`)
    );
    return data;
  }

  async predictSessionsDeficit(sessions: any[]) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${this.ML_URL}/predict-sessions-deficit`, {
          sessions,
        })
      );
      return data;
    } catch (error: any) {
      this.logger.error('sessions deficit error', error?.message);
      throw new HttpException('Service ML indisponible', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
  
}