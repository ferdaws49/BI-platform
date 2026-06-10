// src/ai/forecast/forecast.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const PYTHON_ML_URL = process.env.PYTHON_ML_URL ?? 'http://localhost:8000';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InscriptionPoint {
  ds: string;
  y: number;
}

export interface ForecastPoint {
  mois: string;
  valeur_prevue: number;
  borne_basse: number;
  borne_haute: number;
}

export interface ForecastResponse {
  historique: { mois: string; valeur: number }[];
  previsions: ForecastPoint[];
  tendance: string;
  model_used: string;
  insight: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // ── Entry point ────────────────────────────────────────────────────────────

  async getForecast(
    periodes = 3,
    semestre?: string,
  ): Promise<ForecastResponse> {
    // 1. Récupérer historique inscriptions depuis Supabase
    const historique = await this.getHistoriqueInscriptions(semestre);

    // 2. Appeler Python Prophet
    const result = await this.callPythonForecast(historique, periodes);

    // 3. Si Python down → fallback NestJS
    return result ?? this.fallbackForecast(historique, periodes);
  }

  // ── DB Query ───────────────────────────────────────────────────────────────

  private async getHistoriqueInscriptions(
    semestre?: string,
  ): Promise<InscriptionPoint[]> {
    const months = semestre === 'Semestre' ? 6 : semestre === 'Année' ? 12 : 3;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    try {
      const rows = await this.dataSource.query(
        `
        SELECT
          TO_CHAR(DATE_TRUNC('month', s."date"), 'YYYY-MM') AS ds,
        COUNT(*)::int AS y
  FROM sessions_apprenants sa
  JOIN sessions s ON s.id = sa."sessionId"
  WHERE s."date" IS NOT NULL
  AND s."date" >= $1
  AND s."date" < NOW()
  GROUP BY DATE_TRUNC('month', s."date")
  ORDER BY DATE_TRUNC('month', s."date")
      `,
        [startDate],
      );

      if (!rows || rows.length < 3) {
        this.logger.warn(
          'Historique insuffisant (<3 mois) → Python utilisera static data',
        );
        return [];
      }

      return rows.map((r: any) => ({
        ds: r.ds,
        y: parseInt(r.y),
      }));
    } catch (err) {
      this.logger.warn(`Erreur DB historique: ${err}`);
      return [];
    }
  }

  // ── Python call ────────────────────────────────────────────────────────────

  private async callPythonForecast(
    historique: InscriptionPoint[],
    periodes: number,
  ): Promise<ForecastResponse | null> {
    try {
      const res = await fetch(`${PYTHON_ML_URL}/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historique, periodes }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        this.logger.warn(`Python forecast → HTTP ${res.status}`);
        return null;
      }

      return await res.json();
    } catch (err) {
      this.logger.warn(`Python forecast indisponible → fallback. (${err})`);
      return null;
    }
  }

  // ── Fallback (si Python down) ──────────────────────────────────────────────

  private fallbackForecast(
    historique: InscriptionPoint[],
    periodes: number,
  ): ForecastResponse {
    this.logger.log('Using NestJS fallback forecast (Python unavailable)');

    const data =
      historique.length >= 3
        ? historique
        : [
            { ds: '2024-10', y: 8 },
            { ds: '2024-11', y: 12 },
            { ds: '2024-12', y: 10 },
            { ds: '2025-01', y: 18 },
            { ds: '2025-02', y: 22 },
            { ds: '2025-03', y: 19 },
            { ds: '2025-04', y: 28 },
          ];

    const n = data.length;
    const yValues = data.map((d) => d.y);
    const avg = yValues.reduce((a, b) => a + b, 0) / n;
    const slope = (yValues[n - 1] - yValues[0]) / Math.max(1, n - 1);

    const lastDate = new Date(data[n - 1].ds + '-01');
    const previsions: ForecastPoint[] = [];

    for (let i = 1; i <= periodes; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + i);
      const mois = nextDate.toISOString().slice(0, 7);
      const val = Math.max(0, Math.round(yValues[n - 1] + slope * i));
      const std = Math.max(2, Math.round(avg * 0.15));

      previsions.push({
        mois,
        valeur_prevue: val,
        borne_basse: Math.max(0, val - std),
        borne_haute: val + std,
      });
    }

    const variation = Math.round(
      ((previsions[0].valeur_prevue - yValues[n - 1]) /
        Math.max(1, yValues[n - 1])) *
        100,
    );
    const tendance =
      variation >= 10 ? 'hausse' : variation <= -10 ? 'baisse' : 'stable';
    const insight =
      tendance === 'hausse'
        ? `📈 Hausse prévue de +${variation}% le mois prochain.`
        : tendance === 'baisse'
          ? `📉 Baisse prévue de ${variation}% le mois prochain.`
          : `📊 Inscriptions stables autour de ${previsions[0].valeur_prevue} le mois prochain.`;

    return {
      historique: data.map((d) => ({ mois: d.ds, valeur: d.y })),
      previsions,
      tendance,
      model_used: 'NestJS-LinearTrend-Fallback',
      insight,
    };
  }
}
