// src/ai/alerts/alerts.service.ts
// src/ai/alerts/alerts.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const PYTHON_ML_URL = process.env.PYTHON_ML_URL ?? 'http://localhost:8000';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ApprenantRaw {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  formation: string;
  formateur: string;
}

interface MLFeatures {
  apprenant_id: number;
  taux_presence: number;           // 0.0 → 1.0
  absences_consecutives: number;
  moyenne_notes: number;           // 0 → 20
  tendance_notes: number;          // négatif = en baisse
  moyenne_satisfaction: number;    // 0 → 5
  jours_retard_paiement: number;
}

interface MLResult {
  apprenant_id: number;
  risk_score: number;
  risk_level: string;
  risk_probability: number;
  factors: Record<string, string>;
  model_used: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ── Entry point ────────────────────────────────────────────────────────────

  async getAlerts() {
    const apprenants = await this.getApprenantsActifs();
    if (!apprenants.length) return [];

    const ids = apprenants.map(a => a.id);

    // Fetch all stats in parallel
    const [presences, notes, satisfactions, paiements] = await Promise.all([
      this.getPresenceStats(ids),
      this.getNoteStats(ids),
      this.getSatisfactionStats(ids),
      this.getPaiementStats(ids),
    ]);

    // Build feature vector per apprenant
    const features: MLFeatures[] = apprenants.map(a => {
      const p = presences.find(x => x.apprenant_id === a.id);
      const n = notes.find(x => x.apprenant_id === a.id);
      const s = satisfactions.find(x => x.apprenant_id === a.id);
      const f = paiements.find(x => x.apprenant_id === a.id);

      const total    = p?.total_sessions ?? 1;
      const present  = p?.sessions_presentes ?? total;

      return {
        apprenant_id:          a.id,
        taux_presence:         Math.min(1, present / total),
        absences_consecutives: p?.absences_consecutives ?? 0,
        moyenne_notes:         n?.moyenne_notes ?? 12,
        tendance_notes:        n?.tendance_notes ?? 0,
        moyenne_satisfaction:  s?.moyenne_satisfaction ?? 3.5,
        jours_retard_paiement: f?.jours_retard ?? 0,
      };
    });

    // Call Python ML microservice
    const mlResults = await this.callPythonML(features);

    // If Python is down → use NestJS fallback scoring
    const results = mlResults ?? this.fallbackScoring(features);

    // Merge ML results with apprenant info
    return results
      .map((ml: MLResult) => {
        const a = apprenants.find(x => x.id === ml.apprenant_id);
        if (!a) return null;
        return {
          id:              String(a.id),
          nom:             a.nom,
          prenom:          a.prenom,
          email:           a.email,
          phone:           a.telephone,
          formation:       a.formation,
          formateur:       a.formateur,
          riskScore:       ml.risk_score,
          riskLevel:       ml.risk_level,
          riskProbability: ml.risk_probability,
          factors:         ml.factors,
          modelUsed:       ml.model_used,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.riskScore - a.riskScore);
  }

  // ── DB Queries ─────────────────────────────────────────────────────────────

  private async getApprenantsActifs(): Promise<ApprenantRaw[]> {
    // apprenants.nom/prenom/email/telephone sont dans la table users (via userId)
    return this.dataSource.query(`
      SELECT DISTINCT
        a.id,
        u.nom,
        u.prenom,
        u.email,
        u.phone        AS telephone,
        f.titre        AS formation,
        CONCAT(ufo.nom, ' ', ufo.prenom) AS formateur
      FROM apprenants a
      INNER JOIN users u                ON u.id  = a."userId"
      INNER JOIN sessions_apprenants sa ON sa."apprenantId" = a.id
      INNER JOIN sessions s             ON s.id  = sa."sessionId"
      INNER JOIN formations f           ON f.id  = s."formationId"
      LEFT  JOIN formateur fo           ON fo.id = s."formateurId"
      LEFT  JOIN users ufo              ON ufo.id = fo."userId"
      WHERE s.statut = 'Active'
      ORDER BY u.nom
    `);
  }

  private async getPresenceStats(ids: number[]) {
    if (!ids.length) return [];
    const rows = await this.dataSource.query(`
      SELECT
        p."apprenantId" AS apprenant_id,
        COUNT(*)::int   AS total_sessions,
        COUNT(*) FILTER (WHERE p."estPresent" = true)::int AS sessions_presentes,
        (
          SELECT COUNT(*)::int
          FROM presences p2
          WHERE p2."apprenantId" = p."apprenantId"
            AND p2."estPresent"  = false
            AND p2."dateMarquage" > COALESCE(
              (SELECT MAX(p3."dateMarquage")
               FROM presences p3
               WHERE p3."apprenantId" = p."apprenantId"
                 AND p3."estPresent"  = true),
              '2000-01-01'
            )
        ) AS absences_consecutives
      FROM presences p
      WHERE p."apprenantId" = ANY($1::int[])
      GROUP BY p."apprenantId"
    `, [ids]);

    return rows.map((r: any) => ({
      apprenant_id:          +r.apprenant_id,
      total_sessions:        +r.total_sessions,
      sessions_presentes:    +r.sessions_presentes,
      absences_consecutives: +r.absences_consecutives,
    }));
  }

  private async getNoteStats(ids: number[]) {
    if (!ids.length) return [];
    const rows = await this.dataSource.query(`
      SELECT
        p."apprenantId" AS apprenant_id,
        AVG(p.note)     AS moyenne_notes,
        (
          SELECT note FROM performance
          WHERE "apprenantId" = p."apprenantId"
          ORDER BY date DESC LIMIT 1
        ) - (
          SELECT note FROM performance
          WHERE "apprenantId" = p."apprenantId"
          ORDER BY date ASC LIMIT 1
        ) AS tendance_notes
      FROM performance p
      WHERE p."apprenantId" = ANY($1::int[])
      GROUP BY p."apprenantId"
    `, [ids]);

    return rows.map((r: any) => ({
      apprenant_id:  +r.apprenant_id,
      moyenne_notes: parseFloat(r.moyenne_notes ?? '12'),
      tendance_notes: parseFloat(r.tendance_notes ?? '0'),
    }));
  }

  private async getSatisfactionStats(ids: number[]) {
    if (!ids.length) return [];
    const rows = await this.dataSource.query(`
      SELECT
        "apprenantId" AS apprenant_id,
        AVG(note)     AS moyenne_satisfaction
      FROM satisfaction
      WHERE "apprenantId" = ANY($1::int[])
      GROUP BY "apprenantId"
    `, [ids]);

    return rows.map((r: any) => ({
      apprenant_id:         +r.apprenant_id,
      moyenne_satisfaction: parseFloat(r.moyenne_satisfaction ?? '3.5'),
    }));
  }

  private async getPaiementStats(ids: number[]) {
    if (!ids.length) return [];
    const rows = await this.dataSource.query(`
      SELECT
        "apprenantId" AS apprenant_id,
        GREATEST(0, EXTRACT(DAY FROM NOW() - MAX(date)))::int AS jours_retard
      FROM finances
      WHERE "apprenantId" = ANY($1::int[])
        AND type = 'paiement'
      GROUP BY "apprenantId"
    `, [ids]);

    return rows.map((r: any) => ({
      apprenant_id: +r.apprenant_id,
      jours_retard: +r.jours_retard,
    }));
  }

  // ── Python ML call ─────────────────────────────────────────────────────────

  private async callPythonML(features: MLFeatures[]): Promise<MLResult[] | null> {
    try {
      const res = await fetch(`${PYTHON_ML_URL}/predict`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ apprenants: features }),
        signal:  AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(`Python ML → HTTP ${res.status}`);
        return null;
      }
      const data = await res.json();
      return data.results;
    } catch (err) {
      this.logger.warn(`Python ML indisponible → fallback NestJS. (${err})`);
      return null;
    }
  }

  // ── Fallback scoring (si Python down) ─────────────────────────────────────

  private fallbackScoring(features: MLFeatures[]): MLResult[] {
    return features.map(f => {
      const presenceRisk  = (1 - f.taux_presence) * 100;
      const noteRisk      = Math.max(0, (10 - f.moyenne_notes) / 10 * 100 + Math.abs(Math.min(0, f.tendance_notes)) * 5);
      const satisfRisk    = Math.max(0, (3 - f.moyenne_satisfaction) / 3 * 100);
      const paiementRisk  = Math.min(100, f.jours_retard_paiement * 1.5);

      const score = Math.min(100, Math.max(0, Math.round(
        presenceRisk * 0.40 +
        noteRisk     * 0.35 +
        satisfRisk   * 0.15 +
        paiementRisk * 0.10,
      )));

      const level =
        score >= 75 ? 'critique' :
        score >= 55 ? 'eleve'    :
        score >= 35 ? 'modere'   : 'faible';

      return {
        apprenant_id:     f.apprenant_id,
        risk_score:       score,
        risk_level:       level,
        risk_probability: score / 100,
        factors: {
          presence:     `${Math.round(f.taux_presence * 100)}% de présence`,
          notes:        `Moyenne: ${f.moyenne_notes.toFixed(1)}/20`,
          satisfaction: `${f.moyenne_satisfaction.toFixed(1)}/5`,
          paiements:    f.jours_retard_paiement > 0 ? `${f.jours_retard_paiement}j de retard` : 'À jour',
        },
        model_used: 'NestJS-Fallback',
      };
    });
  }
}