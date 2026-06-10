import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CAForecastResponseDto } from './dtos/ca-forecast.dto';
import { PredictCADto } from './dtos/predict-ca.dto';
import { PredictFilterDto } from './dtos/predict-filter.dto';
import { CAHistoriqueResponseDto, PredictResponseDto } from './dtos/predict-response.dto';


/** Raw row returned from the DW query */
interface RawSessionRow {
  session_id: string;
  formation_id: number;
  formateur_id: number;
  type_session: string;
  capacite: number;
  session_date: Date;
  nb_inscrits: string; // pg returns bigint as string
  revenu: string;
  cout_formateur: string;
  cout_logistique: string;
  impayes: string;
}

/** Cleaned payload sent to ML service */
interface SessionPayload {
  session_id: string;
  nb_inscrits: number;
  capacite: number;
  revenu: number;
  cout_formateur: number;
  cout_logistique: number;
  impayes: number;
  date: string; // ISO date string
}

@Injectable()
export class MlService {
  private readonly ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  private readonly logger = new Logger(MlService.name);

  constructor(private readonly httpService: HttpService,
  ) {}

  // ── CA Forecast ───────────────────────────────────────────
   // ─────────────────────────────────────────────
  // CA — HISTORIQUE (affichage initial)
  // ─────────────────────────────────────────────

  // backend/src/ml/ml.service.ts
async getCAHistorique(filters: PredictCADto): Promise<CAHistoriqueResponseDto> {
  const params = new URLSearchParams();
  
  // Formater en YYYY-MM-DD
  if (filters.dateFrom) {
    const d = filters.dateFrom.length === 10 ? filters.dateFrom : filters.dateFrom.split('T')[0];
    params.append('date_from', d);
  }
  if (filters.dateTo) {
    const d = filters.dateTo.length === 10 ? filters.dateTo : filters.dateTo.split('T')[0];
    params.append('date_to', d);
  }
  
  if (filters.formationId) params.append('formation_id', String(filters.formationId));
  if (filters.formateurId) params.append('formateur_id', String(filters.formateurId));
  if (filters.sessionType) params.append('session_type', filters.sessionType);

  const { data } = await firstValueFrom(
    this.httpService.get(`${this.ML_URL}/ca/historique?${params.toString()}`)
  );
  return data;
}

async predictCA(filters: PredictCADto, periode: number): Promise<CAForecastResponseDto> {
  const { data } = await firstValueFrom(
    this.httpService.post(`${this.ML_URL}/ca/predict`, {
      date_from: filters.dateFrom?.split('T')[0],
      date_to: filters.dateTo?.split('T')[0],
      formation_id: filters.formationId,
      formateur_id: filters.formateurId,
      session_type: filters.sessionType,
      periode: periode,
    })
  );
  return data;
}

async predictDeficit(filters: PredictFilterDto): Promise<PredictResponseDto> {
  const { data } = await firstValueFrom(
    this.httpService.post(`${this.ML_URL}/deficit/predict`, {
      date_from: filters.dateFrom?.split('T')[0],
      date_to: filters.dateTo?.split('T')[0],
      formation_id: filters.formationId,
      formateur_id: filters.formateurId,
      session_type: filters.sessionType,
    })
  );
  return data;
}


  

  


  

 

}
  
