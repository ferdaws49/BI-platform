import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CAForecastResponseDto } from './dtos/ca-forecast.dto';
import { PredictCADto } from './dtos/predict-ca.dto';
import { DataSource } from 'typeorm';

@Injectable()
export class MlService {
  private readonly ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  private readonly logger = new Logger(MlService.name);

  constructor(private readonly httpService: HttpService,
    private readonly dataSource: DataSource,
  ) {}

  // ── CA Forecast ───────────────────────────────────────────
  async predictCA(filters: PredictCADto): Promise<CAForecastResponseDto> {
    try {
      const historique = await this.getFilteredHistory(filters);
      const periode = filters.periode ?? 6;
      const periodeValide = [3, 6, 12].includes(periode) ? periode : 6;

      if (historique.length < 3) {
        throw new HttpException(
          `Historique insuffisant (${historique.length} mois, minimum 3)`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const { data } = await firstValueFrom(
        this.httpService.post(`${this.ML_URL}/predict-ca`, {
          historique,   // ← envoi COMPLET (ca + coûts + volumes)
          periode: periodeValide,
        }),
      );

      this.logger.log(
        `CA prédit pour ${data.previsions?.length ?? 0} mois (période=${periode})`,
      );
      return data;

    } catch (error: unknown) {
  // NE PAS masquer les erreurs métier déjà formatées
  if (error instanceof HttpException) {
    throw error;
  }
  
  const message = error instanceof Error ? error.message : 'Unknown error';
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



  private async getFilteredHistory(filters: PredictCADto) {
    const params: any[] = [];
    let idx = 1;

    let joins = `
      JOIN dw.dim_temps t ON t.sk_temps = f.sk_temps
      JOIN dw.dim_type_finance tf ON tf.sk_type_finance = f.sk_type_finance
      JOIN dw.dim_formation fo ON fo.sk_formation = f.sk_formation
    `;
    let where = `WHERE 1=1`;  // filtre par type fait dans le CASE

    if (filters.categorie) {
      where += ` AND fo.categorie = $${idx++}`;
      params.push(filters.categorie);
    }
    if (filters.formationId) {
      where += ` AND fo.sk_formation = $${idx++}`;
      params.push(filters.formationId);
    }
    if (filters.typeSession) {
      joins += ` JOIN dw.dim_session ds ON ds.sk_session = f.sk_session`;
      where += ` AND ds.type_session = $${idx++}`;
      params.push(filters.typeSession);
    }

    const raw = await this.dataSource.query(
      `
      SELECT
        t.annee,
        t.mois,
        t.trimestre,
        SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) AS ca_mensuel,
        SUM(CASE WHEN tf.type = 'depense_formateur'  THEN f.montant ELSE 0 END) AS total_cout_formateur,
        SUM(CASE WHEN tf.type = 'depense_logistique' THEN f.montant ELSE 0 END) AS total_cout_logistique,
        COUNT(DISTINCT CASE WHEN tf.type = 'paiement' THEN f.sk_session END)   AS nb_sessions,
        COUNT(DISTINCT CASE WHEN tf.type = 'paiement' THEN f.sk_apprenant END) AS total_inscrits,
        SUM(CASE WHEN tf.type = 'impaye' THEN f.montant ELSE 0 END) AS total_impaye
      FROM dw.fact_finance f
      ${joins}
      ${where}
      GROUP BY t.annee, t.mois, t.trimestre
      ORDER BY t.annee, t.mois
      `,
      params,
    );

    return raw.map((r) => ({
      annee: r.annee,
      mois: r.mois,
      trimestre: r.trimestre,
      ca_mensuel: Number(r.ca_mensuel) || 0,
      total_cout_formateur: Number(r.total_cout_formateur) || 0,
      total_cout_logistique: Number(r.total_cout_logistique) || 0,
      nb_sessions: Number(r.nb_sessions) || 0,
      total_inscrits: Number(r.total_inscrits) || 0,
      total_impaye: Number(r.total_impaye) || 0,
    }));
  }
}
  
