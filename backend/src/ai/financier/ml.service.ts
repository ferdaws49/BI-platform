import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CAForecastResponseDto } from './dtos/ca-forecast.dto';
import { PredictCADto } from './dtos/predict-ca.dto';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PredictFilterDto } from './dtos/predict-filter.dto';
import { PredictResponseDto, SessionRiskDto } from './dtos/predict-response.dto';
import { buildSessionDataQuery } from './query/session-data.query';


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
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
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


   


  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC: PREDICT
  // ─────────────────────────────────────────────────────────────────────────────

  async predict(filters: PredictFilterDto): Promise<PredictResponseDto> {
    const sessions = await this.extractAndCleanSessions(filters);

    if (sessions.length === 0) {
      return { sessionRisk: [], insights: ['No sessions found for the given filters.'], recommendations: [] };
    }

    const mlResult = await this.callMlService<{ predictions: SessionRiskDto[] }>('/deficit/predict', { sessions });

    return this.buildFinalResponse(mlResult);
  }


 
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1 — EXTRACT FROM DW
  // ─────────────────────────────────────────────────────────────────────────────

  private async extractAndCleanSessions(filters: PredictFilterDto): Promise<SessionPayload[]> {
    this.logger.log(`Extracting sessions with filters: ${JSON.stringify(filters)}`);

    const { query, params } = buildSessionDataQuery(filters);

    let rows: RawSessionRow[];
    try {
      rows = await this.dataSource.query(query, params);
    } catch (err) {
      this.logger.error('DW query failed', err);
      throw new HttpException('Data warehouse query failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    this.logger.log(`Extracted ${rows.length} raw session rows from DW`);

    // ── STEP 2: Minimal cleaning (NestJS responsibility only) ──────────────────
    return rows
      .filter(row => this.isValidRow(row))
      .map(row => this.toPayload(row));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2 — BASIC VALIDATION (no feature engineering)
  // ─────────────────────────────────────────────────────────────────────────────

  private isValidRow(row: RawSessionRow): boolean {
    if (!row.session_id) return false;
    if (!row.session_date) return false;
    const capacite = Number(row.capacite);
    if (!capacite || capacite <= 0) return false;
    return true;
  }
//Nettoyage minimal côté NestJS
//NestJS ne fait que de la conversion de format. Aucun calcul métier.
// Parce que PostgreSQL retourne parfois des bigint comme string et des Date comme objet. NestJS "normalise" pour que FastAPI reçoive des nombres et des strings propres.
  private toPayload(row: RawSessionRow): SessionPayload {
    return {
      session_id:     row.session_id,
      nb_inscrits:    Math.max(0, Number(row.nb_inscrits)    || 0),
      capacite:       Number(row.capacite)                   || 0,
      revenu:         Math.max(0, Number(row.revenu)         || 0),
      cout_formateur: Math.max(0, Number(row.cout_formateur) || 0),
      cout_logistique:Math.max(0, Number(row.cout_logistique)|| 0),
      impayes:        Math.max(0, Number(row.impayes)        || 0),
      date:           row.session_date instanceof Date
        ? row.session_date.toISOString().split('T')[0]
        : String(row.session_date),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3 — CALL ML SERVICE
  // ─────────────────────────────────────────────────────────────────────────────
//bech yab3eth lel ml-service, nestjs y3ayet l function callMlService w y3tiha endpoint w body.
  private async callMlService<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${this.ML_URL}${endpoint}`;
    this.logger.log(`Calling ML service: POST ${url}`);
    this.logger.log(`Payload: ${JSON.stringify(body)}`); 

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, {
          timeout: 60_000,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      return response.data;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      // ← AJOUTEZ CE BLOC pour voir le vrai message d'erreur de FastAPI
    if (err.response?.data) {
      this.logger.error(`ML service validation error: ${JSON.stringify(err.response.data)}`);
    }
      this.logger.error(`ML service call failed: ${msg}`);
      throw new HttpException(
        `ML service unavailable: ${msg}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4 — BUILD FINAL RESPONSE
  // ─────────────────────────────────────────────────────────────────────────────

  private buildFinalResponse(mlResult: unknown): PredictResponseDto {
    const result = mlResult as { predictions: SessionRiskDto[] };
    const predictions: SessionRiskDto[] = result?.predictions ?? [];

    const highRisk   = predictions.filter(p => p.risk_level === 'high');
    const mediumRisk = predictions.filter(p => p.risk_level === 'medium');
    const totalLoss  = predictions.reduce((acc, p) => acc + (p.estimated_loss ?? 0), 0);

    const insights: string[] = [
      `${predictions.length} sessions analyzed.`,
      `${highRisk.length} session(s) at HIGH deficit risk.`,
      `${mediumRisk.length} session(s) at MEDIUM risk.`,
      ...(totalLoss < 0 ? [`Total estimated loss: ${Math.abs(totalLoss).toFixed(2)} TND`] : []),
    ];

    const recommendations: string[] = [
      ...highRisk.map(p => `Session ${p.session_id}: ${p.recommendation}`),
      ...mediumRisk.map(p => `Session ${p.session_id}: ${p.recommendation}`),
    ];

    return { sessionRisk: predictions, insights, recommendations };
  }
}
  
