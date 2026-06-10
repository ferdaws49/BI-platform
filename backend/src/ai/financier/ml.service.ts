// src/ai/financier/ml.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MlService {
  private readonly ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  constructor(private readonly httpService: HttpService) {}

  // Correspond à GET /ml/ca/historique
  async getCAHistorique(filters: any) {
    const params = {
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      formation_id: filters.formationId,
      formateur_id: filters.formateurId,
      session_type: filters.sessionType,
    };
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.ML_URL}/ca/historique`, { params })
    );
    return data;
  }

  // Correspond à POST /ml/ca/predict/:periode
  async predictCA(filters: any, periode: number) {
    const { data } = await firstValueFrom(
      this.httpService.post(`${this.ML_URL}/ca/predict`, {
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        formation_id: filters.formationId,
        formateur_id: filters.formateurId,
        session_type: filters.sessionType,
        periode: periode, // On envoie la période demandée
      })
    );
    return data;
  }

  // Correspond à POST /ml/predict
  async predictDeficit(filters: any) {
    const { data } = await firstValueFrom(
      this.httpService.post(`${this.ML_URL}/deficit/predict`, {
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        formation_id: filters.formationId,
        formateur_id: filters.formateurId,
        session_type: filters.sessionType,
      })
    );
    // On retourne les prédictions brutes de FastAPI
    return data; 
  }
}